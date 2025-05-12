import { Canvas, CanvasEdge, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import ElkHelper, { ElkLayout } from "src/utils/elk-helper"
import { ELK, ElkNode } from "elkjs"
import { Notice } from "obsidian"
import CanvasHelper from "src/utils/canvas-helper"

export default class LayoutCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  private engines = new WeakMap<Canvas, ELK>()
  private running = new WeakMap<ELK, Promise<ElkNode>>()

  init() {
    // Add commands
    this.plugin.addCommand({
      id: 'add-child-node',
      name: 'Add Child Node',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => ElkHelper.LAYOUTS.includes(canvas.metadata.frontmatter?.layout as ElkLayout) && canvas.selection.size === 1 && canvas.selection.values().next().value.getData().type,
        (canvas: Canvas) => {
          const currentNode = canvas.selection.values().next().value

          const newNode = canvas.createTextNode({
            pos: { x: 0, y: 0 },
            size: { 
              width: canvas.config.defaultTextNodeDimensions.width, 
              height: canvas.config.defaultTextNodeDimensions.height 
            }
          })

          canvas.importData({
            nodes: [],
            edges: [{
              id: `edge-${currentNode.id}-${newNode.id}`,
              fromNode: currentNode.id,
              toNode: newNode.id,
              fromSide: 'bottom', fromFloating: true,
              toSide: 'top', toFloating: true,
            }],
          }, false, true)

          canvas.selectOnly(newNode)
        }
      )
    })

    // Canvas events
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-unloaded:before',
      (canvas: Canvas) => this.engines.delete(canvas)
    ))

    // Metadata events
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-metadata-changed',
      (canvas: Canvas) => this.onLayoutChanged(canvas)
    ))

    // Node events
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-added',
      (canvas: Canvas, node: CanvasNode) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-removed',
      (canvas: Canvas, node: CanvasNode) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-moved',
      (canvas: Canvas, node: CanvasNode) => node.initialized ? this.onLayoutChanged(canvas) : void 0
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas, node: CanvasNode) => node.initialized ? this.onLayoutChanged(canvas) : void 0
    ))

    // Edge events
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-added',
      (canvas: Canvas, edge: CanvasEdge) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-removed',
      (canvas: Canvas, edge: CanvasEdge) => this.onLayoutChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-connection-dragging:after',
      (canvas: Canvas, edge: CanvasEdge) => this.onLayoutChanged(canvas)
    ))
  }

  private onLayoutChanged(canvas: Canvas) {
    const layout = canvas.metadata.frontmatter?.layout as ElkLayout
    if (!layout || typeof layout !== 'string') return

    if (!ElkHelper.LAYOUTS.includes(layout))
      return new Notice(`Layout "${layout}" is not supported. Supported layouts: ${ElkHelper.LAYOUTS.join(', ')}`)

    // Create engine if it doesn't exist
    if (!this.engines.has(canvas))
      this.engines.set(canvas, ElkHelper.getEngine())

    // Run layout
    this.calculateLayout(canvas, layout)
  }

  private async calculateLayout(canvas: Canvas, layout: ElkLayout) {
    const engine = this.engines.get(canvas)
    if (!engine) return

    // Check if the engine is already running
    if (this.running.has(engine)) return

    // Run the layout calculation
    const promise = engine.layout({
      layoutOptions: { 'elk.algorithm': layout },
      ...ElkHelper.toElk(canvas.getData()),
    })

    this.running.set(engine, promise)
    const result = await promise
    this.running.delete(engine)

    // Apply the layout to the canvas
    ElkHelper.applyElk(canvas, result)
  }
}