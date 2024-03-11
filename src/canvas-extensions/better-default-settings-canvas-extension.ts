import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import SettingsManager from "src/settings"

export default class BetterDefaultSettingsCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.applySettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      SettingsManager.SETTINGS_CHANGED_EVENT,
      () => this.applySettings(this.plugin.getCurrentCanvas())
    ))
  }

  private applySettings(canvas: Canvas | null) {
    if (!canvas) return

    canvas.config.defaultTextNodeDimensions = {
      width: this.plugin.settings.getSetting('defaultTextNodeWidth'),
      height: this.plugin.settings.getSetting('defaultTextNodeHeight')
    }
  }
}