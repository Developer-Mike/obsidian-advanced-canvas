import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import AdvancedCanvasPlugin from "src/main"
import SettingsManager, { AdvancedCanvasPluginSettings } from "src/settings"

const EXPOSED_SETTINGS: (keyof AdvancedCanvasPluginSettings)[] = [
  'collapsibleGroupsFeatureEnabled',
  'collapsedGroupPreviewOnDrag'
]

export default class CanvasWrapperDataTaggerCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      SettingsManager.SETTINGS_CHANGED_EVENT,
      () => this.updateExposedSettings(this.plugin.getCurrentCanvas())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.updateExposedSettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DraggingStateChanged,
      (canvas: Canvas, dragging: boolean) => {
        if (dragging) canvas.wrapperEl.dataset.isDragging = 'true'
        else delete canvas.wrapperEl.dataset.isDragging
      }
    ))
  }

  private updateExposedSettings(canvas: Canvas | null) {
    if (!canvas) return

    for (const setting of EXPOSED_SETTINGS) {
      canvas.wrapperEl.dataset[setting] = this.plugin.settings.getSetting(setting).toString()
    }
  }
}