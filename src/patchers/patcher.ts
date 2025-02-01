import AdvancedCanvasPlugin from "src/main"

export default abstract class Patcher {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.patch()
  }

  protected abstract patch(): Promise<void>
}