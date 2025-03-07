import { WorkspaceWindow } from "obsidian"
import AdvancedCanvasPlugin from "src/main"

export default class WindowsManager {
  plugin: AdvancedCanvasPlugin
  windows: Window[] = [window]

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on('window-open', 
      (_win: WorkspaceWindow, window: Window) => this.windows.push(window)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on('window-close', 
      (_win: WorkspaceWindow, window: Window) => this.windows = this.windows.filter((w) => w !== window)
    ))
  }
}