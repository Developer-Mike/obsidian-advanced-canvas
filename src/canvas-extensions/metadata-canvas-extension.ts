import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import { CanvasMetadataNodeData } from "src/@types/AdvancedJsonCanvas"
import { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
import { Notice } from "obsidian"

export default class MetadataCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  private onCanvasChanged(canvas: Canvas) {
    let metadataNode = canvas.nodes.get('metadata')
    let metadataNodeMetadata = (metadataNode?.getData() as CanvasMetadataNodeData | undefined)?.metadata
    let canvasVersion = metadataNodeMetadata?.version // Save version before adding default metadata

    if (!metadataNode || !metadataNodeMetadata || canvasVersion !== CURRENT_SPEC_VERSION)
      return new Notice("Metadata node not found or version mismatch. Should have been migrated (but wasn't).")

    // Set canvas metadata
    canvas.metadata = metadataNodeMetadata
    canvas.metadataNode = metadataNode
    canvas.setMetadata = this.setMetadata.bind(canvas)
  }

  private setMetadata(this: Canvas, key: string, value: any) {
    if (!this.metadataNode) return console.error('Metadata node not found')
    if (!this.metadata) return console.error('Metadata not found')

    this.metadata[key] = value
    this.metadataNode.setData({
      ...this.metadataNode.getData(),
      metadata: this.metadata
    } as CanvasMetadataNodeData)
  }
}