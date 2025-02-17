import { BBox, Canvas, CanvasNode } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "../events"

export default class DebugHelper {
  plugin: AdvancedCanvasPlugin
  logging = true

  private nodeAddedCount = 0
  private nodeChangedCount = 0
  private edgeAddedCount = 0
  private edgeChangedCount = 0

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (_canvas: Canvas) => {
        this.nodeAddedCount = 0
        this.nodeChangedCount = 0
        this.edgeAddedCount = 0
        this.edgeChangedCount = 0
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeAdded,
      (_canvas: Canvas, _node: CanvasNode) => {
        if (this.logging) console.count('🟢 NodeAdded')
        this.nodeAddedCount++
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeChanged,
      (_canvas: Canvas, _node: CanvasNode) => {
        if (this.logging) console.count('🟡 NodeChanged')
        this.nodeChangedCount++
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeAdded,
      (_canvas: Canvas, _edge: CanvasNode) => {
        if (this.logging) console.count('🟢 EdgeAdded')
        this.edgeAddedCount++
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (_canvas: Canvas, _edge: CanvasNode) => {
        if (this.logging) console.count('🟡 EdgeChanged')
        this.edgeChangedCount++
      }
    ))
  }

  resetEfficiency() {
    this.nodeAddedCount = 0
    this.nodeChangedCount = 0
    this.edgeAddedCount = 0
    this.edgeChangedCount = 0
  }

  logEfficiency() {
    const canvas = this.plugin.getCurrentCanvas()
    if (!canvas) return

    console.log('NodeAdded Efficiency:', this.nodeAddedCount / canvas.nodes.size)
    console.log('NodeChanged Efficiency:', this.nodeChangedCount / canvas.nodes.size)

    console.log('EdgeAdded Efficiency:', this.edgeAddedCount / canvas.edges.size)
    console.log('EdgeChanged Efficiency:', this.edgeChangedCount / canvas.edges.size)
  }

  static markBBox(canvas: Canvas, bbox: BBox, duration: number = -1) {
    const node = canvas.createTextNode({
      pos: { x: bbox.minX, y: bbox.minY },
      size: { width: bbox.maxX - bbox.minX, height: bbox.maxY - bbox.minY },
      text: '',
      focus: false
    })

    node.setData({
      ...node.getData(),
      id: 'debug-bbox',
      color: '1',
      styleAttributes: {
        border: 'invisible'
      }
    })

    if (duration >= 0) {
      setTimeout(() => {
        canvas.removeNode(node)
      }, duration)
    }
  }
}