import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { Canvas, CanvasNode } from "src/@types/Canvas"

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const
const DIRECTION_KEYS = { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' } as const

export default class NavigationShortcutsCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    for (const direction of DIRECTIONS) {
      this.plugin.addCommand({
        id: `move-focus-${direction}`,
        name: `Move focus ${direction}`,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => canvas.getSelectionData().nodes.length === 1,
          (canvas: Canvas) => this.moveFocus(canvas, direction)
        ),
        hotkeys: [{ modifiers: ['Alt'], key: DIRECTION_KEYS[direction] }]
      })
    }
  }

  private moveFocus(canvas: Canvas, direction: typeof DIRECTIONS[number]) {
    const nodeId = this.getNextNode(canvas, direction)
    if (!nodeId) return

    const node = canvas.nodes.get(nodeId)
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

    return closestNode?.node?.id
  }
}