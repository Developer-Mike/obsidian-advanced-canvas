import { around } from "monkey-around"
import { Plugin } from "obsidian"

export function patchWorkspaceFunction(plugin: Plugin, getTarget: () => any, functions: { [key: string]: (next: any) => (...args: any) => any }) {
  const tryPatch = () => {
    const target = getTarget()
    if (!target) return false

    const uninstaller = around(target.constructor.prototype, functions)
    plugin.register(uninstaller)

    return true
  }

  const successful = tryPatch()
  if (successful) return

  const listener = plugin.app.workspace.on('layout-change', () => {
    const successful = tryPatch()
    if (successful) plugin.app.workspace.offref(listener)
  })

  plugin.registerEvent(listener)
}