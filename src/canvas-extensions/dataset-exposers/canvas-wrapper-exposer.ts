import { Canvas } from "src/@types/Canvas"
import { AdvancedCanvasPluginSettingsValues } from "src/settings"
import CanvasExtension from "../canvas-extension"

const EXPOSED_SETTINGS: (keyof AdvancedCanvasPluginSettingsValues)[] = [
  'disableFontSizeRelativeToZoom',
  'hideBackgroundGridWhenInReadonly',
  'collapsibleGroupsFeatureEnabled',
  'collapsedGroupPreviewOnDrag',
  'allowFloatingEdgeCreation',
]

export default class CanvasWrapperExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => this.updateExposedSettings(this.plugin.getCurrentCanvas())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.updateExposedSettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:dragging-state-changed',
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