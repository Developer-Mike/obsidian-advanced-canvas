import { around } from "monkey-around"
import { Plugin } from "obsidian"

// All keys in T that are functions
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T]

// The type of the function at key K in T
type KeyFunction<T, K extends FunctionKeys<T>> = 
  T[K] extends (...args: any[]) => any ? T[K] : never

// The type of a patch function for key K in T
type KeyFunctionReplacement<T, K extends FunctionKeys<T>> = 
  (this: T, ...args: Parameters<KeyFunction<T, K>>) => ReturnType<KeyFunction<T, K>>

// The wrapper of a patch function for key K in T
type PatchFunctionWrapper<T, K extends FunctionKeys<T>> = 
  (next: KeyFunction<T, K>) => KeyFunctionReplacement<T, K>

// The object of patch functions for T
type FunctionPatchObject<T> = {
  [K in FunctionKeys<T>]?: PatchFunctionWrapper<T, K> & { __overrideExisting?: boolean }
}

export default class PatchHelper {
  static OverrideExisting<T, K extends FunctionKeys<T>>(
    fn: PatchFunctionWrapper<T, K> & { __overrideExisting?: boolean }
  ) { return Object.assign(fn, { __overrideExisting: true }) }

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
    for (const key of Object.keys(patches) as Array<FunctionKeys<T>>) {
      const patch = patches[key]
      if (patch?.__overrideExisting) {
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