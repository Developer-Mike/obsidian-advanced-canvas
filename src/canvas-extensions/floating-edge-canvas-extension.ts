import { Canvas, CanvasEdge } from "src/@types/Canvas"
import { CanvasEvent } from "src/events"
import CanvasExtension from "./canvas-extension"

export default class FloatingEdgeCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'floatingEdgeFeatureEnabled' as const }

  private onPointerMove: (e: MouseEvent) => void

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeConnectionDragging.Before,
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean) => this.onEdgeStartedDragging(canvas, edge, event, newEdge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeConnectionDragging.After,
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean) => this.onEdgeStoppedDragging(canvas, edge, event, newEdge)
    ))
  }

  onEdgeStartedDragging(canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean) {
    if (newEdge && this.plugin.settings.getSetting("newEdgeFromSideFloating")) edge.setData({
      ...edge.getData(),
      fromFloating: true
    })

    this.onPointerMove = _ => {
      console.log(canvas.pointer)
    }
    document.addEventListener('pointermove', this.onPointerMove)
  }

  onEdgeStoppedDragging(canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean) {
    document.removeEventListener('pointermove', this.onPointerMove)
  }
}