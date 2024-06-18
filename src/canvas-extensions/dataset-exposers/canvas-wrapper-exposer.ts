import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import SettingsManager, { AdvancedCanvasPluginSettings } from "src/settings"
import CanvasExtension from "../canvas-extension"

const EXPOSED_SETTINGS: (keyof AdvancedCanvasPluginSettings)[] = [
  'performanceOptimizationEnabled',
  'collapsibleGroupsFeatureEnabled',
  'collapsedGroupPreviewOnDrag'
]

export default class CanvasWrapperExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
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