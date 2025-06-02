import { Canvas, CanvasNode } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"
import { Notice } from "obsidian"
import TextHelper from "src/utils/text-helper"

type Direction = 'up' | 'down' | 'left' | 'right'
const DIRECTIONS = ['up', 'down', 'left', 'right'] as Direction[]

export default class CommandsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'commandsFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'toggle-readonly',
      name: 'Toggle readonly',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => canvas.setReadonly(!canvas.readonly)
      )
    })

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

    this.plugin.addCommand({
      id: 'zoom-to-fit',
      name: 'Zoom to fit',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => canvas.zoomToFit()
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

      this.plugin.addCommand({
        id: `navigate-${direction}`,
        name: `Navigate ${direction}`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => canvas.getSelectionData().nodes.length === 1,
          (canvas: Canvas) => this.navigate(canvas, direction)
        ),
      })
    }

    this.plugin.addCommand({
      id: 'flip-selection-horizontally',
      name: 'Flip selection horizontally',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size > 0,
        (canvas: Canvas) => this.flipSelection(canvas, true 
      ))
    })

    this.plugin.addCommand({
      id: 'flip-selection-vertically',
      name: 'Flip selection vertically',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size > 0,
        (canvas: Canvas) => this.flipSelection(canvas, false)
      )
    })

    this.plugin.addCommand({
      id: 'swap-nodes',
      name: 'Swap nodes',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.getSelectionData().nodes.length === 2,
        (canvas: Canvas) => {
          const selectedNodes = canvas.getSelectionData().nodes
            .map(nodeData => canvas.nodes.get(nodeData.id))
            .filter(node => node !== undefined) as CanvasNode[]
          if (selectedNodes.length !== 2) return

          const [nodeA, nodeB] = selectedNodes
          const nodeAData = nodeA.getData()
          const nodeBData = nodeB.getData()

          nodeA.setData({ ...nodeAData, x: nodeBData.x, y: nodeBData.y, width: nodeBData.width, height: nodeBData.height })
          nodeB.setData({ ...nodeBData, x: nodeAData.x, y: nodeAData.y, width: nodeAData.width, height: nodeAData.height })

          canvas.pushHistory(canvas.getData())
        }
      )
    })

    this.plugin.addCommand({
      id: 'copy-wikilink-to-node',
      name: 'Copy wikilink to node',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size === 1,
        (canvas: Canvas) => {
          const file = canvas.view.file
          if (!file) return

          const nodeData = canvas.getSelectionData().nodes[0]
          if (!nodeData) return

          const wikilink = `[[${file.path}#${nodeData.id}|${file.name} (${TextHelper.toTitleCase(nodeData.type)} node)]]`
          navigator.clipboard.writeText(wikilink)

          new Notice("Copied wikilink to node to clipboard.", 2000)
        }
      )
    })
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

  private flipSelection(canvas: Canvas, horizontally: boolean) {
    const selectionData = canvas.getSelectionData()
    if (selectionData.nodes.length === 0) return

    const nodeIds = new Set()

    // Flip nodes
    for (const nodeData of selectionData.nodes) {
      nodeIds.add(nodeData.id)

      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue
      
      const newX = horizontally ?
        2 * selectionData.center.x - nodeData.x - nodeData.width :
        nodeData.x

      const newY = horizontally ?
        nodeData.y :
        2 * selectionData.center.y - nodeData.y - nodeData.height

      node.setData({
        ...nodeData,
        x: newX,
        y: newY
      })
    }

    // Flip edges
    for (const edge of canvas.edges.values()) {
      const edgeData = edge.getData()

      let newFromSide = edgeData.fromSide
      if (nodeIds.has(edgeData.fromNode) && BBoxHelper.isHorizontal(edgeData.fromSide) === horizontally)
        newFromSide = BBoxHelper.getOppositeSide(edgeData.fromSide)

      let newToSide = edgeData.toSide
      if (nodeIds.has(edgeData.toNode) && BBoxHelper.isHorizontal(edgeData.toSide) === horizontally)
        newToSide = BBoxHelper.getOppositeSide(edgeData.toSide)

      edge.setData({
        ...edgeData,
        fromSide: newFromSide,
        toSide: newToSide
      })
    }

    canvas.pushHistory(canvas.getData())
  }

  private navigate(canvas: Canvas, direction: typeof DIRECTIONS[number]) {
    const node = this.getNextNode(canvas, direction)
    if (!node) return

    canvas.updateSelection(() => {
      canvas.selection = new Set([node])
    })
  }

  private getNextNode(canvas: Canvas, direction: typeof DIRECTIONS[number]) {
    const selectedNodeData = canvas.getSelectionData().nodes?.first()
    if (!selectedNodeData) return

    const selectedNodeBBox = {
      minX: selectedNodeData.x,
      minY: selectedNodeData.y,
      maxX: selectedNodeData.x + selectedNodeData.width,
      maxY: selectedNodeData.y + selectedNodeData.height
    }

    const possibleTargetNodes = Array.from(canvas.nodes.values())
      .filter(node => {
        const nodeData = node.getData()
        return nodeData.id !== selectedNodeData.id && (nodeData.type === 'text' || nodeData.type === 'file')
      })
    
    const closestNode = possibleTargetNodes.reduce((closestNode, node) => {
      const nodeBBox = node.getBBox()

      const isInVerticalRange = selectedNodeBBox.minY <= nodeBBox.maxY && selectedNodeBBox.maxY >= nodeBBox.minY
      const isInHorizontalRange = selectedNodeBBox.minX <= nodeBBox.maxX && selectedNodeBBox.maxX >= nodeBBox.minX

      if (['up', 'down'].includes(direction) && !isInHorizontalRange) return closestNode
      if (['left', 'right'].includes(direction) && !isInVerticalRange) return closestNode

      let distance = -1
      switch (direction) {
        case 'up': distance = selectedNodeBBox.minY - nodeBBox.maxY; break
        case 'down': distance = nodeBBox.minY - selectedNodeBBox.maxY; break
        case 'left': distance = selectedNodeBBox.minX - nodeBBox.maxX; break
        case 'right': distance = nodeBBox.minX - selectedNodeBBox.maxX; break
      }
      if (distance < 0) return closestNode

      if (!closestNode) return { node, distance }
      if (distance < closestNode.distance) return { node, distance }

      if (distance === closestNode.distance) {
        const selectedNodeCenter = {
          x: selectedNodeData.x + selectedNodeData.width / 2,
          y: selectedNodeData.y + selectedNodeData.height / 2
        }
        const closestNodeCenter = {
          x: closestNode.node.x + closestNode.node.width / 2,
          y: closestNode.node.y + closestNode.node.height / 2
        }
        const nodeCenter = {
          x: node.x + node.width / 2,
          y: node.y + node.height / 2
        }

        const closestNodeDistance = Math.sqrt(
          Math.pow(selectedNodeCenter.x - closestNodeCenter.x, 2) +
          Math.pow(selectedNodeCenter.y - closestNodeCenter.y, 2)
        )
        const nodeDistance = Math.sqrt(
          Math.pow(selectedNodeCenter.x - nodeCenter.x, 2) +
          Math.pow(selectedNodeCenter.y - nodeCenter.y, 2)
        )

        if (nodeDistance < closestNodeDistance) return { node, distance }
      }

      return closestNode
    }, null as { node: CanvasNode, distance: number } | null)

    return closestNode?.node
  }
}