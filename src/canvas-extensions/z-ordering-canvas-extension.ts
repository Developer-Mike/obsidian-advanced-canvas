import { Menu } from "obsidian"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasExtension from "./canvas-extension"

export default class ZOrderingCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'zOrderingControlFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:node-menu',
      (menu: Menu, node: CanvasNode) => this.nodeContextMenu(node, menu)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:selection-menu',
      (menu: Menu, canvas: Canvas) => this.selectionContextMenu(canvas, menu)
    ))
  }

  private nodeContextMenu(node: CanvasNode, menu: Menu) {
    this.addZOrderingContextMenuItems(node.canvas, [node], menu)
  }

  private selectionContextMenu(canvas: Canvas, menu: Menu) {
    const selectedNodes = canvas.getSelectionData().nodes
      .map(nodeData => canvas.nodes.get(nodeData.id))
      .filter(node => node !== undefined) as CanvasNode[]

    this.addZOrderingContextMenuItems(canvas, selectedNodes, menu)
  }

  private addZOrderingContextMenuItems(canvas: Canvas, nodes: CanvasNode[], menu: Menu) {
    menu.addSeparator()

    if (this.plugin.settings.getSetting('zOrderingControlShowOneLayerShiftOptions') && nodes.length === 1) {
      menu.addItem(item => {
        item.setTitle('Move one layer forward')
        item.setIcon('arrow-up')
        item.onClick(() => this.moveOneLayer(canvas, nodes.first()!, true))
      })

      menu.addItem(item => {
        item.setTitle('Move one layer backward')
        item.setIcon('arrow-down')
        item.onClick(() => this.moveOneLayer(canvas, nodes.first()!, false))
      })
    }

    menu.addItem(item => {
      item.setTitle('Bring to Front')
      item.setIcon('bring-to-front')
      item.onClick(() => this.moveMaxLayers(canvas, nodes, true))
    })

    menu.addItem(item => {
      item.setTitle('Send to Back')
      item.setIcon('send-to-back')
      item.onClick(() => this.moveMaxLayers(canvas, nodes, false))
    })
    
    if (nodes.some(node => node.getData().zIndex !== undefined)) {
      menu.addItem(item => {
        item.setTitle('Remove persistent z-index')
        item.setIcon('pin-off')
        item.onClick(() => this.removePersistentZIndexes(canvas, nodes))
      })
    }

    menu.addSeparator()
  }

  private moveOneLayer(canvas: Canvas, selectedNode: CanvasNode, forward: boolean) {
    const selectedNodeBBox = selectedNode.getBBox()
    const collidingNodes = [...canvas.nodes.values()]
      .filter(node => BBoxHelper.isColliding(selectedNodeBBox, node.getBBox())) // Only nodes that collide with the selected node
      .filter(node => node !== selectedNode) // Exclude the selected node

    const nearestZIndexNode = collidingNodes
      .sort((a, b) => forward ? a.zIndex - b.zIndex : b.zIndex - a.zIndex) // Sort by zIndex
      .filter(node => forward ? node.zIndex > selectedNode.zIndex : node.zIndex < selectedNode.zIndex) // Only nodes that are one layer above or below the selected node
      .first()
    if (nearestZIndexNode === undefined) return // Already at the top or bottom

    const targetZIndex = nearestZIndexNode.zIndex

    // Shift the nearest zIndex node to the selected node's zIndex
    this.setNodesZIndex([nearestZIndexNode], selectedNode.zIndex)

    // Shift the selected node to the nearest zIndex node
    this.setNodesZIndex([selectedNode], targetZIndex)
  }

  private moveMaxLayers(canvas: Canvas, selectedNodes: CanvasNode[], forward: boolean) {
    let targetZIndex = forward ? 
      Math.max(...this.getAllZIndexes(canvas)) + 1 : 
      Math.min(...this.getAllZIndexes(canvas)) - selectedNodes.length

    this.setNodesZIndex(selectedNodes, targetZIndex)
  }

  private removePersistentZIndexes(_canvas: Canvas, nodes: CanvasNode[]) {
    for (const node of nodes) node.setZIndex(undefined)
  }

  private setNodesZIndex(nodes: CanvasNode[], zIndex: number) {
    const sortedNodes = nodes.sort((a, b) => a.zIndex - b.zIndex)

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i]
      const finalZIndex = zIndex + i

      node.setZIndex(finalZIndex)
    }
  }

  private getAllZIndexes(canvas: Canvas) {
    return [...canvas.nodes.values()].map(n => n.zIndex)
  }
}