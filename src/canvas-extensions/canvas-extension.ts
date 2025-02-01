import AdvancedCanvasPlugin from "src/main"
import { AdvancedCanvasPluginSettingsValues } from "src/settings"

export default abstract class CanvasExtension {
  plugin: AdvancedCanvasPlugin

  abstract isEnabled(): boolean | keyof AdvancedCanvasPluginSettingsValues
  abstract init(): void

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    const isEnabled = this.isEnabled()
    
    if (!(isEnabled === true || this.plugin.settings.getSetting(isEnabled as any))) return

    this.init()
  }
}