import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import Konva from "konva"

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
  }

  private onCanvasChanged(canvas: Canvas) {
    canvas.stageEl = document.createElement('div')
    canvas.stageEl.classList.add('draw-stage')

    canvas.stageEl.style.position = 'absolute'
    canvas.stageEl.style.top = '0'
    canvas.stageEl.style.left = '0'
    canvas.stageEl.style.pointerEvents = 'none'
    canvas.stageEl.style.width = `${canvas.canvasEl.clientWidth}px`
    canvas.stageEl.style.height = `${canvas.canvasEl.clientHeight}px`

    canvas.wrapperEl.appendChild(canvas.stageEl)

    canvas.stage = new Konva.Stage({
      container: canvas.stageEl,
      width: canvas.canvasEl.clientWidth,
      height: canvas.canvasEl.clientHeight,
    })

    const layer = new Konva.Layer()
    canvas.stage.add(layer)

    const rect = new Konva.Rect({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fill: 'red',
      draggable: true,
    })
    layer.add(rect)
  }

  private onFrameRequested(canvas: Canvas) {
    if (!canvas.stage) return

    canvas.stage.x(-canvas.x * canvas.scale + canvas.canvasEl.clientWidth / 2)
    canvas.stage.y(-canvas.y * canvas.scale + canvas.canvasEl.clientHeight / 2)

    canvas.stage.scaleX(canvas.scale)
    canvas.stage.scaleY(canvas.scale)
  }
}