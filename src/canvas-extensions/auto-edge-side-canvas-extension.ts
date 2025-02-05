import { Canvas, CanvasEdge } from "src/@types/Canvas"
import { CanvasEvent } from "src/events"
import CanvasExtension from "./canvas-extension"

export default class AutoEdgeSideCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'autoEdgeSideFeatureEnabled' as const }

  init() {
    return;

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(canvas, edge)
    ))
  }

  private onEdgeChanged(canvas: Canvas, edge: CanvasEdge) {
    console.log(canvas.isDragging)
  }
}