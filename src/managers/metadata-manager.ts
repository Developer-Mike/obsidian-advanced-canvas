import { CanvasFileNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { TAbstractFile, TFile } from "obsidian"
import { CanvasData } from "src/@types/AdvancedJsonCanvas"
import { Canvas } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import CanvasHelper from "src/utils/canvas-helper"

export const METADATA_FILE_SUFFIX = '.meta.md'
export const METADATA_FRONTMATTER_KEY = 'canvas-metadata'

export default class MetadataManager {
  private plugin: AdvancedCanvasPlugin
  private metadataSyncTasks: Set<string> = new Set()
  private metadataCreationTasks: Record<string, Promise<TFile>> = {}

  /**
    * Get the metadata file associated with a canvas file
    * @property canvasFile The canvas file
    * @property path Optional path to HINT the metadata file location (validation is still performed)
    * @property callback Optional callback to be called when the metadata file is created (if it is being created right now)
    */
  getMetadataFile(
    canvasFile: TFile | null,
    path?: string,
    callback?: (file: TFile) => void
  ): TFile | null {
    if (!canvasFile?.path) return null

    if (canvasFile.path in this.metadataCreationTasks) {
      if (callback) this.metadataCreationTasks[canvasFile.path].then(callback)
      return null // Still being created
    }

    const metadataFilePath = path ?? `${canvasFile.path}${METADATA_FILE_SUFFIX}`
    let metadataFile = canvasFile.vault?.getAbstractFileByPath(metadataFilePath)

    // Verify ownership using frontmatter key
    if (metadataFile instanceof TFile) {
      const metadataFileCache = this.plugin.app.metadataCache.getFileCache(metadataFile as TFile)

      // Instead of checking if correct ownership, we check if incorrect ownership exists -> reclaim on accidental deletion of property
      if (metadataFileCache?.frontmatterLinks?.some(link =>
        link.key === METADATA_FRONTMATTER_KEY &&
        this.plugin.app.metadataCache.getFirstLinkpathDest(link.link, (metadataFile as TFile).path)?.path !== canvasFile.path
      )) {
        console.warn(`MetadataManager: Thought found metadata file '${metadataFile.path}' but ownership verification of canvas '${canvasFile.path}' failed.`)
        metadataFile = null
      }
    }

    // If no metadata file found, try a desperate search
    if (!metadataFile) {
      console.warn(`MetadataManager: Could not find metadata file for canvas '${canvasFile.path}'. Trying desperate search...`)
      const backlinkedFiles = this.plugin.app.metadataCache.getBacklinksForFile(canvasFile).data

      for (const [backlinkSourcePath, backlinks] of backlinkedFiles.entries()) {
        if (!backlinkSourcePath.endsWith(METADATA_FILE_SUFFIX)) continue
        if (!backlinks.some(occurence => (occurence as any).key === METADATA_FRONTMATTER_KEY)) continue

        metadataFile = this.getMetadataFile(canvasFile, backlinkSourcePath)
        if (metadataFile) break
      }

      console.warn(`MetadataManager: Desperate search ${metadataFile ? 'succeeded' : 'failed'} for canvas '${canvasFile.path}'.`)
    }

    return metadataFile instanceof TFile ? metadataFile : null
  }

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled'))
      return

    this.listen()
  }

  private async listen() {
    // Catch unresolved links that may origin from an orphaned metadata file
    this.plugin.registerEvent(this.plugin.app.metadataCache.on(
      "changed",
      (file: TFile) => this.cleanUpOrphanedMetadataFiles(file)
    ))

    await new Promise<void>(res => this.plugin.app.workspace.onLayoutReady(() => res()))

    // Sync back metadata file changes to canvas file (e.g. if modified by bases)
    this.plugin.registerEvent(this.plugin.app.metadataCache.on(
      "changed",
      (file: TFile) => this.updateCanvasFile(file)
    ))

    this.plugin.registerEvent(this.plugin.app.vault.on(
      "create",
      (file: TAbstractFile) => this.updateMetadataFile(file, true)
    ))

    this.plugin.registerEvent(this.plugin.app.vault.on(
      "modify",
      (file: TAbstractFile) => this.updateMetadataFile(file)
    ))

    this.plugin.registerEvent(this.plugin.app.vault.on(
      "rename",
      (file: TAbstractFile, oldPath: string) => {
        // We need to wait for the metadata cache update because the canvas rename
        // triggers a link change in the metadata file as well
        const dependenciesUpdatedEvent = this.plugin.app.metadataCache.on("changed", () => {
          this.plugin.app.metadataCache.offref(dependenciesUpdatedEvent) // Listen once
          this.renameMetadataFile(file, oldPath)
        })

        this.plugin.registerEvent(dependenciesUpdatedEvent)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.vault.on(
      "delete",
      (file: TAbstractFile) => this.deleteMetadataFile(file)
    ))

    // FIXME: Metadata files still get suggested
    // FIXME: Inline suggestions don't work

    this.plugin.addCommand({
      id: 'open-canvas-metadata-file',
      name: 'Open Canvas Metadata File',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => this.getMetadataFile(canvas.view?.file) !== null,
        (canvas: Canvas) => this.plugin.app.workspace.getLeaf(false).openFile(
          this.getMetadataFile(canvas.view?.file) as TFile,
          { state: { ignoreRedirect: true } }
        )
      )
    })
  }

  private async cleanUpOrphanedMetadataFiles(file: TFile) {
    if (!(file instanceof TFile) || !file.path.endsWith(METADATA_FILE_SUFFIX)) return

    const unresolvedLinks = this.plugin.app.metadataCache.unresolvedLinks[file.path]
    if (!unresolvedLinks) return

    for (const link in unresolvedLinks) {
      if (!link.endsWith('.canvas')) continue

      const fileCache = this.plugin.app.metadataCache.getFileCache(file)
      const canvasMetadataKeyValue = fileCache?.frontmatterLinks?.find(fl => fl.key === METADATA_FRONTMATTER_KEY)

      if (canvasMetadataKeyValue?.link === link) {
        console.warn(`MetadataManager: Deleting orphaned metadata file '${file.path}' (linked canvas '${link}' does not exist).`)
        await this.plugin.app.vault.delete(file)

        break
      }
    }
  }

  private async updateMetadataFile(canvasFile: TAbstractFile, forceCreate = false) {
    if (!(canvasFile instanceof TFile) || canvasFile?.extension !== 'canvas') return

    // Get canvas data
    let data: Partial<CanvasData> = {}
    try { data = JSON.parse(await this.plugin.app.vault.read(canvasFile)) as CanvasData } catch { }

    // Get metadata file
    let metadataFile = forceCreate ? null : this.getMetadataFile(canvasFile)
    let frontmatter: Record<string, any> = {}
    if (metadataFile) await this.plugin.app.fileManager.processFrontMatter(metadataFile, fm => { frontmatter = fm })

    // If currently syncing from metadata file to canvas file, skip to avoid loops
    if (this.metadataSyncTasks.has(metadataFile?.path ?? '')) {
      this.metadataSyncTasks.delete(metadataFile?.path ?? '')
      return
    }

    // Create metadata file if it doesn't exist
    if (!metadataFile) {
      // If file already exists, but is not owned, throw a warning and skip creation
      if (this.plugin.app.vault.getAbstractFileByPath(`${canvasFile.path}${METADATA_FILE_SUFFIX}`) instanceof TFile) {
        console.warn(`MetadataManager: Metadata file for canvas '${canvasFile.path}' exists but ownership verification failed. Skipping metadata update.`)
        return
      }

      // Create metadata file
      const creationTask = this.plugin.app.vault.create(`${canvasFile.path}${METADATA_FILE_SUFFIX}`, "")
      this.metadataCreationTasks[canvasFile.path] = creationTask
      metadataFile = await creationTask
      delete this.metadataCreationTasks[canvasFile.path]

      // Sync frontmatter from canvas file on initial creation
      const canvasFrontmatter = data?.metadata?.frontmatter
      if (canvasFrontmatter) Object.assign(frontmatter, canvasFrontmatter)
    }

    // Update the frontmatter ownership key
    if (!(METADATA_FRONTMATTER_KEY in frontmatter))
      frontmatter[METADATA_FRONTMATTER_KEY] = `[[${canvasFile.path}]]`

    // Update metadata text
    let metadataText = "\n>[!WARNING] This is an auto-generated file. Do not edit directly vvvBELOWvvv (it will be overwritten)!\n\n"

    // Update metadata embeds (file nodes)
    const embeds: [string, string][] = data?.nodes
      ?.filter(node => node.type === "file" && (node as any).file)
      ?.map((node: CanvasFileNodeData) => [node.id, node.file])
      ?? []

    let embedsText = "# Embeds\n"
    embeds.forEach(([id, embedPath]) => {
      embedsText += `- [[${embedPath}|${id}]]\n`
    })
    metadataText += embedsText

    // FIXME: Update metadata links (text nodes)

    // Write text to metadata file
    await this.plugin.app.vault.modify(metadataFile as TFile, metadataText)

    // Restore frontmatter
    await this.plugin.app.fileManager.processFrontMatter(
      metadataFile as TFile,
      fm => Object.assign(fm, frontmatter)
    )
  }

  private async updateCanvasFile(metadataFile: TFile) {
    if (!metadataFile?.path?.endsWith(METADATA_FILE_SUFFIX)) return
    this.metadataSyncTasks.add(metadataFile.path)

    let canvasFile: TFile | null = null
    this.plugin.app.metadataCache.getFileCache(metadataFile)?.frontmatterLinks?.forEach(link => {
      if (link.key !== METADATA_FRONTMATTER_KEY) return
      const linkedFile = this.plugin.app.metadataCache.getFirstLinkpathDest(link.link, metadataFile.path)

      if (linkedFile instanceof TFile && linkedFile.extension === 'canvas') canvasFile = linkedFile
    })
    if (!canvasFile) return

    // Get canvas data
    let data: Partial<CanvasData> = {}
    try { data = JSON.parse(await this.plugin.app.vault.read(canvasFile)) as CanvasData } catch { }

    // Get metadata file frontmatter
    let frontmatter: Record<string, any> = {}
    await this.plugin.app.fileManager.processFrontMatter(metadataFile, fm => { frontmatter = fm })

    // Update canvas data frontmatter
    data.metadata ??= {} as any
    data.metadata!.frontmatter = frontmatter

    // Write updated canvas data
    await this.plugin.app.vault.modify(canvasFile, JSON.stringify(data, null, 2))
  }

  private async renameMetadataFile(file: TAbstractFile, oldPath: string) {
    if (!(file instanceof TFile) || file?.extension !== 'canvas') return

    const oldMetadataFilePath = `${oldPath}${METADATA_FILE_SUFFIX}`
    const metadataFile = this.getMetadataFile(file, oldMetadataFilePath)
    if (!metadataFile) return

    const newMetadataFilePath = `${file.path}${METADATA_FILE_SUFFIX}`
    await this.plugin.app.vault.rename(metadataFile, newMetadataFilePath)
  }

  private async deleteMetadataFile(file: TAbstractFile | null) {
    if (!(file instanceof TFile) || file?.extension !== 'canvas') return

    const metadataFile = this.getMetadataFile(file)
    if (!metadataFile) return

    await this.plugin.app.vault.delete(metadataFile)
  }
}
