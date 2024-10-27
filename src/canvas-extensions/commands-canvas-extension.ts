import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "../core/canvas-extension"

type Direction = 'up' | 'down' | 'left' | 'right'
const DIRECTIONS = ['up', 'down', 'left', 'right'] as Direction[]

export default class CommandsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'commandsFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'create-text-node',
      name: 'Create text node',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        (canvas: Canvas) => this.createTextNode(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'create-file-node',
      name: 'Create file node',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        (canvas: Canvas) => this.createFileNode(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'select-all-edges',
      name: 'Select all edges',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => canvas.updateSelection(() => 
          canvas.selection = new Set(canvas.edges.values())
        )
      )
    })

    this.plugin.addCommand({
      id: 'zoom-to-selection',
      name: 'Zoom to selection',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => canvas.zoomToSelection()
      )
    })

    for (const direction of DIRECTIONS) {
      this.plugin.addCommand({
        id: `clone-node-${direction}`,
        name: `Clone node ${direction}`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => !canvas.readonly && canvas.selection.size === 1 && canvas.selection.values().next().value?.getData().type === 'text',
          (canvas: Canvas) => this.cloneNode(canvas, direction)
        )
      })

      this.plugin.addCommand({
        id: `expand-node-${direction}`,
        name: `Expand node ${direction}`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => !canvas.readonly && canvas.selection.size === 1,
          (canvas: Canvas) => this.expandNode(canvas, direction)
        )
      })
    }
  }

  private createTextNode(canvas: Canvas) {
    const size = canvas.config.defaultTextNodeDimensions
    const pos = CanvasHelper.getCenterCoordinates(canvas, size)

    canvas.createTextNode({ pos: pos, size: size })
  }

  private async createFileNode(canvas: Canvas) {
    const size = canvas.config.defaultFileNodeDimensions
    const pos = CanvasHelper.getCenterCoordinates(canvas, size)
    const file = await new FileSelectModal(this.plugin.app, undefined, true).awaitInput()

    canvas.createFileNode({ pos: pos, size: size, file: file })
  }

  private cloneNode(canvas: Canvas, cloneDirection: Direction) {
    const sourceNode = canvas.selection.values().next().value
    if (!sourceNode) return
    const sourceNodeData = sourceNode.getData()

    const nodeMargin = this.plugin.settings.getSetting('cloneNodeMargin')
    const offset = { 
      x: (sourceNode.width + nodeMargin) * (cloneDirection === 'left' ? -1 : (cloneDirection === 'right' ? 1 : 0)),
      y: (sourceNode.height + nodeMargin) * (cloneDirection === 'up' ? -1 : (cloneDirection === 'down' ? 1 : 0))
    }

    const clonedNode = canvas.createTextNode({
      pos: {
        x: sourceNode.x + offset.x,
        y: sourceNode.y + offset.y
      },
      size: {
        width: sourceNode.width,
        height: sourceNode.height
      }
    })

    clonedNode.setData({ 
      ...clonedNode.getData(), 
      color: sourceNodeData.color,
      styleAttributes: sourceNodeData.styleAttributes
    })

    if (this.plugin.settings.getSetting('zoomToClonedNode'))
      canvas.zoomToBbox(clonedNode.getBBox())
  }

  private expandNode(canvas: Canvas, expandDirection: Direction) {
    const node = canvas.selection.values().next().value
    if (!node) return

    const expandNodeStepSize = this.plugin.settings.getSetting('expandNodeStepSize')
    const expand = {
      x: expandDirection === 'left' ? -1 : (expandDirection === 'right' ? 1 : 0),
      y: expandDirection === 'up' ? -1 : (expandDirection === 'down' ? 1 : 0)
    }

    node.setData({
      ...node.getData(),
      width: node.width + expand.x * expandNodeStepSize,
      height: node.height + expand.y * expandNodeStepSize
    })
  }
}