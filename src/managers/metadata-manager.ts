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
  private static metadataCreationTasks: Record<string, Promise<TFile>> = {}

  /**
    * Get the metadata file associated with a canvas file
    * @property canvasFile The canvas file
    * @property path Optional path to HINT the metadata file location (validation is still performed)
    * @property callback Optional callback to be called when the metadata file is created (if it is being created right now)
    */
  static getMetadataFile(
    canvasFile: TFile | null,
    path?: string,
    callback?: (file: TFile) => void
  ): TFile | null {
    if (!canvasFile?.path) return null

    const metadataFilePath = path ?? `${canvasFile.path}${METADATA_FILE_SUFFIX}`
    const metadataFile = canvasFile.vault?.getAbstractFileByPath(metadataFilePath)

    if (!metadataFile && callback)
      MetadataManager.metadataCreationTasks[canvasFile.path]?.then(callback)

    // FIXME: Verify ownership using frontmatter key

    return metadataFile instanceof TFile ? metadataFile : null
  }

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled'))
      return

    this.listen()
  }

  private async listen() {
    await new Promise<void>(res => this.plugin.app.workspace.onLayoutReady(() => res()))

    this.plugin.registerEvent(this.plugin.app.vault.on(
      "create",
      (file: TAbstractFile) => this.updateMetadataFile(file)
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

    // FIXME: If deleted outside obsidian, metadata file remains
    this.plugin.registerEvent(this.plugin.app.vault.on(
      "delete",
      (file: TAbstractFile) => this.deleteMetadataFile(file)
    ))

    // FIXME: Clicking on metadata file search results does not open the canvas file
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "file-open",
      async (file: TFile | null) => {
        console.log(file, this.plugin.app.workspace.getLeaf(false).getEphemeralState())
      }
    ))

    this.plugin.addCommand({
      id: 'open-canvas-metadata-file',
      name: 'Open Canvas Metadata File',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => MetadataManager.getMetadataFile(canvas.view?.file) !== null,
        (canvas: Canvas) => this.plugin.app.workspace.getLeaf(false).openFile(
          MetadataManager.getMetadataFile(canvas.view?.file) as TFile
        )
      )
    })
  }

  private async updateMetadataFile(file: TAbstractFile) {
    if (!(file instanceof TFile) || file?.extension !== 'canvas') return

    // Get metadata file
    let metadataFile = MetadataManager.getMetadataFile(file)

    // Create metadata file if it doesn't exist
    if (!metadataFile) {
      const creationTask = this.plugin.app.vault.create(
        `${file.path}${METADATA_FILE_SUFFIX}`, ""
      )

      MetadataManager.metadataCreationTasks[file.path] = creationTask
      metadataFile = await creationTask
      delete MetadataManager.metadataCreationTasks[file.path]
    }

    // Get the frontmatter of the metadata file if it exists
    let frontmatter: Record<string, any> = {}
    if (metadataFile) await this.plugin.app.fileManager.processFrontMatter(
      metadataFile, fm => { frontmatter = fm }
    )

    // Get canvas data
    let data = { nodes: [], edges: [] } as any as CanvasData
    try { data = JSON.parse(await this.plugin.app.vault.read(file)) as CanvasData } catch { }
    if (!data?.nodes || !Array.isArray(data.nodes)) return

    // Generate the embeds array
    const embeds: [string, string][] = data.nodes
      .filter(node => node.type === "file" && (node as any).file)
      .map((node: CanvasFileNodeData) => [node.id, node.file])

    // Update metadata file frontmatter
    delete frontmatter[METADATA_FRONTMATTER_KEY]
    const updatedFrontmatter = {
      [METADATA_FRONTMATTER_KEY]: `[[${file.path}]]`,
      ...frontmatter
    }

    // Update metadata text
    let metadataText = "\n>[!WARNING] This is an auto-generated file. Do not edit directly **BELOW** this line.\n\n"

    // Update metadata embeds
    let embedsText = "# Embeds\n"
    embeds.forEach(([id, embedPath]) => {
      embedsText += `- [[${embedPath}|${id}]]\n`
    })
    metadataText += embedsText

    // Write text to metadata file
    await this.plugin.app.vault.modify(metadataFile as TFile, metadataText)

    // Restore frontmatter
    await this.plugin.app.fileManager.processFrontMatter(metadataFile as TFile, fm =>
      Object.assign(fm, updatedFrontmatter)
    )
  }

  private async renameMetadataFile(file: TAbstractFile, oldPath: string) {
    if (!(file instanceof TFile) || file?.extension !== 'canvas') return

    const oldMetadataFilePath = `${oldPath}${METADATA_FILE_SUFFIX}`
    const metadataFile = MetadataManager.getMetadataFile(file, oldMetadataFilePath)
    if (!metadataFile) return

    const newMetadataFilePath = `${file.path}${METADATA_FILE_SUFFIX}`
    await this.plugin.app.vault.rename(metadataFile, newMetadataFilePath)
  }

  private async deleteMetadataFile(file: TAbstractFile | null) {
    if (!(file instanceof TFile) || file?.extension !== 'canvas') return

    const metadataFile = MetadataManager.getMetadataFile(file)
    if (!metadataFile) return

    await this.plugin.app.vault.delete(metadataFile)
  }

  private async openCanvasFileThroughMetadataFile(file: TFile | null) {
    const path = file?.path
    if (!path?.endsWith(METADATA_FILE_SUFFIX)) return

    const canvasFilePath = path.slice(0, -METADATA_FILE_SUFFIX.length)
    const canvasFile = this.plugin.app.vault.getAbstractFileByPath(canvasFilePath)
    if (!(canvasFile instanceof TFile)) return

    await this.plugin.app.workspace.getLeaf(false).openFile(canvasFile)
  }
}
