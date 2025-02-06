import { Canvas, CanvasEdge } from "src/@types/Canvas"
import { CanvasEvent } from "src/events"
import CanvasExtension from "./canvas-extension"

export default class AutoEdgeSideCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'autoEdgeSideFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeConnectionDragging.Before,
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent) => this.onEdgeStartedDragging(canvas, edge, event)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeConnectionDragging.After,
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent) => this.onEdgeStoppedDragging(canvas, edge, event)
    ))
  }

  onEdgeStartedDragging(canvas: Canvas, edge: CanvasEdge, event: PointerEvent) {

  }

  onEdgeStoppedDragging(canvas: Canvas, edge: CanvasEdge, event: PointerEvent) {
    
  }
}