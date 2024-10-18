import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "../core/canvas-events"
import { Canvas, CanvasNode } from "src/@types/Canvas"

export default class DebugHelper {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeAdded,
      (_canvas: Canvas, _node: CanvasNode) => console.count('🟢 NodeAdded')
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeChanged,
      (_canvas: Canvas, _node: CanvasNode) => console.count('🟡 NodeChanged')
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeAdded,
      (_canvas: Canvas, _edge: CanvasNode) => console.count('🟢 EdgeAdded')
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (_canvas: Canvas, _edge: CanvasNode) => console.count('🟡 EdgeChanged')
    ))
  }
}