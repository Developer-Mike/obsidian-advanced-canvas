import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "../canvas-extension"

export default class CanvasMetadataExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-metadata-changed',
      (canvas: Canvas) => this.updateExposedSettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.updateExposedSettings(canvas)
    ))
  }

  private updateExposedSettings(canvas: Canvas) {
    // Expose start node
    const startNodeId = canvas.metadata['startNode']
    for (const [nodeId, node] of canvas.nodes) {
      if (nodeId === startNodeId) node.nodeEl.dataset.isStartNode = 'true'
      else delete node.nodeEl.dataset.isStartNode
    }
  }
}