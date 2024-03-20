import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import AdvancedCanvasPlugin from "src/main"

export default class CssclassesCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    plugin.registerEvent(plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  private previousCssclasses: string[] = []
  private onCanvasChanged(canvas: Canvas) {
    this.previousCssclasses.forEach((cssclass) => {
      canvas.wrapperEl.classList.remove(cssclass)
    })

    this.previousCssclasses = canvas.metadata.cssclasses || []
    this.previousCssclasses.forEach((cssclass) => {
      canvas.wrapperEl.classList.add(cssclass)
    })
  }
}