import { Canvas } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"

type Direction = 'up' | 'down' | 'left' | 'right'
const DRIECTIONS = ['up', 'down', 'left', 'right'] as Direction[]
const DIRECTION_KEYS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight'
}

export default class CommandsCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('commandsFeatureEnabled')) return

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
      id: 'zoom-to-selection',
      name: 'Zoom to selection',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => canvas.zoomToSelection()
      )
    })

    for (const direction of DRIECTIONS) {
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
        hotkeys: [
          {
            modifiers: ['Alt'],
            key: DIRECTION_KEYS[direction]
          }
        ],
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

  private cloneNode(canvas: Canvas, cloneDirection: Direction) {
    const sourceNode = canvas.selection.values().next().value
    if (!sourceNode) return
    const sourceNodeData = sourceNode.getData()

    const nodeMargin = this.plugin.settingsManager.getSetting('cloneNodeMargin')
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

    clonedNode.color = sourceNode.color
    canvas.setNodeUnknownData(clonedNode, 'shape', sourceNodeData.shape)

    if (this.plugin.settingsManager.getSetting('zoomToClonedNode'))
      canvas.zoomToBbox(clonedNode.getBBox())
  }

  private expandNode(canvas: Canvas, expandDirection: Direction) {
    const node = canvas.selection.values().next().value
    if (!node) return

    const expandNodeStepSize = this.plugin.settingsManager.getSetting('expandNodeStepSize')
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