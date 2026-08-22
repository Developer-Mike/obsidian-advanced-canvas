import { Canvas } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import { AdvancedCanvasPluginSettingsValues } from "src/settings"
import CanvasExtension from "../canvas-extension"

const EXPOSED_SETTINGS: (keyof AdvancedCanvasPluginSettingsValues)[] = [
  'disableFontSizeRelativeToZoom',
  'wrapGroupLabels', // Added by an LLM agent
  'hideGroupLabels', // Added by an LLM agent
  'boxedNodeLabels', // Added by an LLM agent
  'hideBackgroundGridWhenInReadonly',
  'readingModeFixEnabled',
  'collapsibleGroupsFeatureEnabled',
  'collapsedGroupPreviewOnDrag',
  'allowFloatingEdgeCreation',
]

export default class CanvasWrapperExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => CanvasWrapperExposerExtension.updateCanvasExposedSettings(
        this.plugin,
        this.plugin.getCurrentCanvas()?.wrapperEl
      )
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => CanvasWrapperExposerExtension.updateCanvasExposedSettings(
        this.plugin,
        canvas.wrapperEl
      )
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:dragging-state-changed',
      (canvas: Canvas, dragging: boolean) => {
        if (dragging) canvas.wrapperEl.dataset.isDragging = 'true'
        else delete canvas.wrapperEl.dataset.isDragging
      }
    ))
  }

  static updateCanvasExposedSettings(plugin: AdvancedCanvasPlugin, element?: HTMLElement) {
    if (!element) return

    for (const setting of EXPOSED_SETTINGS) {
      const value = plugin.settings.getSetting(setting)
      element.dataset[setting] = JSON.stringify(value)
    }
  }
}
