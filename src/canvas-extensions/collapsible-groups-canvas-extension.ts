import { Canvas, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"

export default class CollapsibleGroupsCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('collapsibleGroupsFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeAdded,
      (canvas: Canvas, node: CanvasNode) => this.onNodeAdded(canvas, node)
    ))
  }

  onNodeAdded(canvas: Canvas, node: CanvasNode) {
    if (node.getData().type !== 'group') return

    // Add collapse/expand button next to the label
  }
}