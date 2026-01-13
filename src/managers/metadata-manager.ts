import { CanvasFileNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { TAbstractFile, TFile } from "obsidian"
import { Canvas, CanvasView } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import CanvasHelper from "src/utils/canvas-helper"

export const METADATA_FILE_SUFFIX = '.meta.md'
export const METADATA_FRONTMATTER_KEY = 'canvas-metadata'

export default class MetadataManager {
  private plugin: AdvancedCanvasPlugin

  /**
    * Get the metadata file associated with a canvas file
    * @property canvasFile The canvas file
    * @property path Optional path to HINT the metadata file location (validation is still performed)
    */
  static getMetadataFile(canvasFile: TFile | null, path?: string): TFile | null {
    const metadataFilePath = path ?? `${canvasFile?.path}${METADATA_FILE_SUFFIX}`
    const metadataFile = canvasFile?.vault?.getAbstractFileByPath(metadataFilePath)

    // FIXME: Verify ownership using frontmatter key

    return metadataFile instanceof TFile ? metadataFile : null
  }

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    this.listen()
  }

  private listen() {
    this.plugin.app.workspace.on(
      "advanced-canvas:canvas-view-saved:after",
      (view: CanvasView) => this.updateMetadataFile(view)
    )

    this.plugin.app.workspace.on(
      "advanced-canvas:canvas-view-unloaded:before",
      (view: CanvasView) => this.updateMetadataFile(view)
    )

    this.plugin.app.vault.on(
      "rename",
      (file: TAbstractFile, oldPath: string) => this.renameMetadataFile(file, oldPath)
    )

    this.plugin.app.vault.on(
      "delete",
      (file: TAbstractFile) => this.deleteMetadataFile(file)
    )

    // FIXME: Clicking on metadata file search results does not open the canvas file
    this.plugin.app.workspace.on(
      "file-open",
      async (file: TFile | null) => {
        console.log(file, this.plugin.app.workspace.getLeaf(false).getEphemeralState())
      }
    )

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

  private async updateMetadataFile(view: CanvasView) {
    if (!view._loaded) return

    // Get canvas file
    const canvasFile = view?.file
    if (!canvasFile) return

    // Get canvas data
    const data = view?.canvas?.getData()

    // Generate the embeds array
    const embeds: [string, string][] = data.nodes
      .filter(node => node.type === "file" && (node as any).file)
      .map((node: CanvasFileNodeData) => [node.id, node.file])

    // Get metadata file
    let metadataFile = MetadataManager.getMetadataFile(canvasFile)

    // Get the frontmatter of the metadata file if it exists
    let frontmatter: Record<string, any> = {}
    if (metadataFile) await this.plugin.app.fileManager.processFrontMatter(
      metadataFile, fm => { frontmatter = fm }
    )

    // Remove metadata file if no frontmatter nor embeds exist
    if (metadataFile && Object.keys(frontmatter).length === 0 && embeds.length === 0) {
      await this.plugin.app.vault.delete(metadataFile)
      return
    }

    // Create metadata file if it doesn't exist
    metadataFile ??= await this.plugin.app.vault.create(
      `${canvasFile.path}${METADATA_FILE_SUFFIX}`, ""
    )

    // Update metadata file frontmatter
    delete frontmatter[METADATA_FRONTMATTER_KEY]
    const updatedFrontmatter = {
      [METADATA_FRONTMATTER_KEY]: `[[${canvasFile.path}]]`,
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
