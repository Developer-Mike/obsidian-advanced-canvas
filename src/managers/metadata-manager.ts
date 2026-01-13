import { CanvasFileNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { TFile } from "obsidian"
import { Canvas, CanvasView } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import CanvasHelper from "src/utils/canvas-helper"

export const METADATA_FILE_SUFFIX = '.meta.md'

export default class MetadataManager {
  private plugin: AdvancedCanvasPlugin

  static getMetadataFile(canvasFile: TFile | null): TFile | null {
    const metadataFilePath = `${canvasFile?.path}${METADATA_FILE_SUFFIX}`
    const metadataFile = canvasFile?.vault?.getAbstractFileByPath(metadataFilePath)

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

    /* this.plugin.app.workspace.on(
      "file-open",
      async (file: TFile | null) => this.openCanvasFileThroughMetadataFile(file)
    ) */

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
    let frontmatter = {}
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
    const updatedFrontmatter = JSON.parse(JSON.stringify(frontmatter))

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

  private async openCanvasFileThroughMetadataFile(file: TFile | null) {
    const path = file?.path
    if (!path?.endsWith(METADATA_FILE_SUFFIX)) return

    const canvasFilePath = path.slice(0, -METADATA_FILE_SUFFIX.length)
    const canvasFile = this.plugin.app.vault.getAbstractFileByPath(canvasFilePath)
    if (!(canvasFile instanceof TFile)) return

    await this.plugin.app.workspace.getLeaf(false).openFile(canvasFile)
  }
}
