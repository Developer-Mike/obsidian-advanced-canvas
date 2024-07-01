import { around } from "monkey-around"
import { Plugin } from "obsidian"

export default class PatchHelper {
  static tryPatchWorkspacePrototype<T>(plugin: Plugin, getTarget: () => T|undefined, functions: { [key: string]: (next: any) => (...args: any) => any }): Promise<T> {
    return new Promise((resolve) => {
      const tryPatch = () => {
        const target = getTarget()
        if (!target) return null

        const uninstaller = around(target.constructor.prototype, functions)
        plugin.register(uninstaller)

        return target
      }

      const result = tryPatch()
      if (result) {
        resolve(result)
        return
      }

      const listener = plugin.app.workspace.on('layout-change', () => {
        const result = tryPatch()

        if (result) {
          plugin.app.workspace.offref(listener)
          resolve(result)
        }
      })

      plugin.registerEvent(listener)
    })
  }

  static patchObjectPrototype<T>(plugin: Plugin, target: T, functions: { [key: string]: (next: any) => (...args: any) => any }): void {
    const uninstaller = around((target as any).constructor.prototype, functions)
    plugin.register(uninstaller)
  }

  static patchObjectInstance<T>(plugin: Plugin, target: T, functions: { [key: string]: (next: any) => (...args: any) => any }): void {
    const uninstaller = around(target as any, functions)
    plugin.register(uninstaller)
  }
}