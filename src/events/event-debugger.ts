import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "./events"
import { Canvas, CanvasNode } from "src/@types/Canvas"

export default class EventDebugger {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeAdded,
      (_canvas: Canvas, _node: CanvasNode) => console.log('NodeAdded')
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodesChanged,
      (_canvas: Canvas, nodes: CanvasNode[]) => nodes.forEach(_node => console.log('NodeChanged'))
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeAdded,
      (_canvas: Canvas, _edge: CanvasNode) => console.log('EdgeAdded')
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (_canvas: Canvas, _edge: CanvasNode) => console.log('EdgeChanged')
    ))
  }
}