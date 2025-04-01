import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import Konva from "konva"

export interface Drawing {
  type: 'ink'
  points: number[]
  width: number
  color: string
}

export default class DrawCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:animation-frame-requested:after',
      (canvas: Canvas) => this.onFrameRequested(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:file-changed',
      (canvas: Canvas) => this.onCanvasUnloaded(canvas)
    ))
  }

  private onCanvasChanged(canvas: Canvas) {
    canvas.stageEl = document.createElement('div')
    canvas.stageEl.classList.add('draw-stage')
    canvas.wrapperEl.appendChild(canvas.stageEl)

    canvas.stage = new Konva.Stage({
      container: canvas.stageEl,
      width: canvas.canvasEl.clientWidth,
      height: canvas.canvasEl.clientHeight,
    })

    const layer = new Konva.Layer()
    canvas.stage.add(layer)

    for (const drawing of canvas.drawings ?? []) {
      if (drawing.type !== 'ink') return
      const path = this.createPath(canvas, drawing.points, drawing.color, drawing.width)
      layer.add(path)
    }

    canvas.stageEl.style.pointerEvents = 'initial' // TODO: Debugging
    canvas.stageEl.addEventListener('mousedown', (event) => this.onMouseDown(canvas, event))
    canvas.stageEl.addEventListener('mousemove', (event) => this.onMouseMove(canvas, event))
    canvas.stageEl.addEventListener('mouseup', (event) => this.onMouseUp(canvas, event))
  }

  private onFrameRequested(canvas: Canvas) {
    if (!canvas.stage) return

    canvas.stage.x(-canvas.x * canvas.scale + canvas.canvasEl.clientWidth / 2)
    canvas.stage.y(-canvas.y * canvas.scale + canvas.canvasEl.clientHeight / 2)

    canvas.stage.scaleX(canvas.scale)
    canvas.stage.scaleY(canvas.scale)
  }

  private onMouseDown(canvas: Canvas, event: MouseEvent) {
    if (!canvas.stage) return

    canvas.currentPath = this.createPath(canvas, [], 'black', 5)
    canvas.stage.getLayers().first()!.add(canvas.currentPath)

    this.onMouseMove(canvas, event)
  }

  private onMouseMove(canvas: Canvas, event: MouseEvent) {
    if (!canvas.stage) return
    if (!canvas.currentPath) return

    const pos = canvas.posFromEvt(event)
    if (!pos) return

    const points = canvas.currentPath.points() as number[]

    // Min distance between points
    if (points.length > 1) {
      const minDistance = canvas.currentPath.strokeWidth()

      const lastX = points[points.length - 4]
      const lastY = points[points.length - 3]

      const currentX = points[points.length - 2]
      const currentY = points[points.length - 1]

      if (Math.abs(currentX - lastX) < minDistance && Math.abs(currentY - lastY) < minDistance)
        points.splice(points.length - 2, 2)
    }

    points.push(pos.x, pos.y)
    canvas.currentPath.points(points)
  }

  private onMouseUp(canvas: Canvas, event: MouseEvent) {
    if (!canvas.stage) return
    if (!canvas.currentPath) return

    canvas.drawings ??= []
    canvas.drawings.push({
      type: 'ink',
      points: canvas.currentPath.points() ?? [],
      width: canvas.currentPath.strokeWidth() ?? 0,
      color: canvas.currentPath.stroke().toString() ?? 'black',
    })

    canvas.currentPath = undefined
  }

  private onCanvasUnloaded(canvas: Canvas) {
    canvas.stage?.destroy()
    canvas.stageEl?.remove()
  }

  private createPath(canvas: Canvas, points: number[], color: string, width: number): Konva.Line {
    const path = new Konva.Line({
      points,
      stroke: color,
      strokeWidth: width,
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.25,
    })

    return path
  }
}