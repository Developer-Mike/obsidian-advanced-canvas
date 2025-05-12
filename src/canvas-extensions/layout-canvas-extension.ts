import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export default class LayoutCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-metadata-changed',
      (canvas: Canvas) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-created',
      (canvas: Canvas, node: CanvasNode) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-removed',
      (canvas: Canvas, node: CanvasNode) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-moved',
      (canvas: Canvas, node: CanvasNode) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas, node: CanvasNode) => this.onLayoutChanged(canvas)
    ))
  }

  private onLayoutChanged(canvas: Canvas) {
    const layout = canvas.metadata.frontmatter?.layout
    if (!layout) return

    console.log('Layout changed:', layout)
  }
}