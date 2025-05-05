import { around } from "monkey-around"
import AdvancedCanvasPlugin from "src/main"
import { Plugin } from "obsidian"

// Is any
type IsAny<T> = 0 extends 1 & T ? true : false
type NotAny<T> = IsAny<T> extends true ? never : T

// All keys in T that are functions
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T]

// The type of the function at key K in T
type KeyFunction<T, K extends FunctionKeys<T>> = 
  T[K] extends (...args: any[]) => any ? T[K] : never

// The type of a patch function for key K in T
type KeyFunctionReplacement<T, K extends FunctionKeys<T>, R extends ReturnType<KeyFunction<T, K>>> = 
  (this: T, ...args: Parameters<KeyFunction<T, K>>) => IsAny<ReturnType<KeyFunction<T, K>>> extends false 
  ? ReturnType<KeyFunction<T, K>> & NotAny<R>
  : any

// The wrapper of a patch function for key K in T
type PatchFunctionWrapper<T, K extends FunctionKeys<T>, R extends ReturnType<KeyFunction<T, K>>> =
  (next: KeyFunction<T, K>) => KeyFunctionReplacement<T, K, R>

// The object of patch functions for T
type FunctionPatchObject<T> = {
  [K in FunctionKeys<T>]?: PatchFunctionWrapper<T, K, ReturnType<KeyFunction<T, K>>> & { __overrideExisting?: boolean }
}

export default abstract class Patcher {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.patch()
  }

  protected abstract patch(): Promise<void>

  protected static async waitForViewRequest<T>(plugin: AdvancedCanvasPlugin, viewType: string, patch: (view: T) => void): Promise<T> {
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

  static OverrideExisting<T, K extends FunctionKeys<T>, R extends ReturnType<KeyFunction<T, K>>>(
    fn: PatchFunctionWrapper<T, K, R> & { __overrideExisting?: boolean }
  ) { return Object.assign(fn, { __overrideExisting: true }) }

  static patchThisAndPrototype<T>(
    plugin: Plugin,
    object: T | undefined,
    patches: FunctionPatchObject<T>,
  ): T | null {
    Patcher.patch(plugin, object, patches)
    return Patcher.patchPrototype(plugin, object, patches)
  }

  static patchPrototype<T>(
    plugin: Plugin,
    target: T | undefined,
    patches: FunctionPatchObject<T>
  ): T | null {
    return Patcher.patch(plugin, target, patches, true)
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
      const result = Patcher.patchPrototype(plugin, getTarget(), patches)
      if (result) {
        resolve(result)
        return
      }

      const listener = plugin.app.workspace.on('layout-change', () => {
        const result = Patcher.patchPrototype(plugin, getTarget(), patches)

        if (result) {
          plugin.app.workspace.offref(listener)
          resolve(result)
        }
      })

      plugin.registerEvent(listener)
    })
  }
}