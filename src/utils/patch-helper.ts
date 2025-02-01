import { around } from "monkey-around"
import { Plugin } from "obsidian"

type FunctionPatchObject<T> = {
  [Key in keyof T | any]: ((next: T[Key | any]) => (this: T, ...args: any) => any) & { __overrideExisting?: boolean }
}

export default class PatchHelper {
  static OverrideExisting<
    T,
    K extends keyof T
  >(fn: (next: T[K]) => (this: T, ...args: any[]) => any) {
    return Object.assign(fn, { __overrideExisting: true })
  }

  static patchPrototype<T>(
    plugin: Plugin,
    target: T | undefined,
    patches: FunctionPatchObject<T>
  ): T | null {
    return PatchHelper.patch(plugin, target, patches, true)
  }

  static patch<T>(
    plugin: Plugin,
    object: T | undefined,
    patches: FunctionPatchObject<T>,
    prototype: boolean = false
  ): T | null {
    if (!object) return null
    const target = prototype ? object.constructor.prototype : object

    // Validate override requirements
    for (const key of Object.keys(patches) as Array<keyof T>) {
      const patch = patches[key]
      if (patch.__overrideExisting) {
        if (typeof target[key] !== 'function')
          throw new Error(`Method ${String(key)} does not exist on target`)
      }
    }

    const uninstaller = around(target as any, patches)
    plugin.register(uninstaller)

    return object
  }

  static tryPatchWorkspacePrototype<T>(
    plugin: Plugin, 
    getTarget: () => T | undefined, 
    patches: FunctionPatchObject<T>
  ): Promise<T> {
    return new Promise((resolve) => {
      const result = PatchHelper.patchPrototype(plugin, getTarget(), patches)
      if (result) {
        resolve(result)
        return
      }

      const listener = plugin.app.workspace.on('layout-change', () => {
        const result = PatchHelper.patchPrototype(plugin, getTarget(), patches)

        if (result) {
          plugin.app.workspace.offref(listener)
          resolve(result)
        }
      })

      plugin.registerEvent(listener)
    })
  }
}