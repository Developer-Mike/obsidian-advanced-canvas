import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import { CanvasMetadataNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
import { MetadataCache, Notice } from "obsidian"

export default class MetadataCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
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
    canvas.getMetadata = this.getMetadata.bind(canvas)
    canvas.setMetadata = this.setMetadata.bind(canvas)

    // Trigger metadata change event
    this.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
  }

  private getMetadata(this: Canvas, key: string) {
    if (!this.metadataNode) return console.error('Metadata node not found')
    if (!this.metadata) return console.error('Metadata not found')

    return this.metadata[key as keyof typeof this.metadata]
  }

  private setMetadata(this: Canvas, key: string, value: any) {
    if (!this.metadataNode) return console.error('Metadata node not found')
    if (!this.metadata) return console.error('Metadata not found')

    this.metadata[key as keyof typeof this.metadata] = value
    this.metadataNode.setData({
      ...this.metadataNode.getData(),
      metadata: this.metadata
    } as CanvasMetadataNodeData)
  }

  private onNodeChanged(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData() as CanvasMetadataNodeData
    if (nodeData.id !== 'metadata') return

    // Save metadata
    canvas.metadata = nodeData.metadata

    // Trigger metadata change event
    this.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
  }
}