import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import { CanvasMetadata, CanvasMetadataNodeData } from "src/@types/AdvancedJsonCanvas"

const SPEC_VERSION = '1.0-1.0'

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

    // Create metadata if it doesn't exist
    metadataNodeMetadata ??= {
      version: SPEC_VERSION,
      frontmatter: {}
    }

    if (!metadataNode) {
      // Create metadata node
      canvas.importData({
        nodes: [
          {
            id: 'metadata',
            type: 'text',
            text: '',
            x: 0, y: 0,
            width: 0, height: 0,
            metadata: metadataNodeMetadata,
          }
        ],
        edges: []
      }, false, true)

      metadataNode = canvas.nodes.get('metadata')
      if (!metadataNode) return console.error('Failed to create metadata node')
    }

    if (canvasVersion !== SPEC_VERSION) {
      // TODO: Migrate canvas to new version
    }

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