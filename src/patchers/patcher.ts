import { around } from "monkey-around"
import AdvancedCanvasPlugin from "src/main"

export default abstract class Patcher {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.patch()
  }

  protected abstract patch(): Promise<void>

  protected static async patchViewOnRequest<T>(plugin: AdvancedCanvasPlugin, viewType: string, patch: (view: T) => void): Promise<T> {
    return new Promise(resolve => {
      const uninstaller = around(plugin.app.viewRegistry.viewByType, {
        [viewType]: (next: any) => function (...args: any): any {
          const view = next.call(this, ...args)
          patch(view)

          // Create a new view
          const patchedView = next.call(this, ...args)

          uninstaller()
          resolve(patchedView)

          return patchedView
        }
      })
    })
  }
}