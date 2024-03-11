import { WorkspaceWindow } from "obsidian"
import AdvancedCanvasPlugin from "./main"

export default class WindowsManager {
  plugin: AdvancedCanvasPlugin
  windows: Window[] = []

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.addWindow(window)

    this.plugin.registerEvent(this.plugin.app.workspace.on('window-open', 
      (_win: WorkspaceWindow, window: Window) => this.addWindow(window)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on('window-close', 
      (_win: WorkspaceWindow, window: Window) => this.removeWindow(window)
    ))
  }

  private addWindow(window: Window) {
    this.windows.push(window)
    this.plugin.app.workspace.trigger('advanced-canvas:window-open')

    console.log('WindowsManager: window opened', window)
  }

  private removeWindow(window: Window) {
    this.windows = this.windows.filter((w) => w !== window)
    this.plugin.app.workspace.trigger('advanced-canvas:window-close')

    console.log('WindowsManager: window closed', window)
  }
}