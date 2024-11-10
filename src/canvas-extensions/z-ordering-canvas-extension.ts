import { Canvas, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../core/canvas-extension"
import { Menu } from "obsidian"

export default class ZOrderingCanvasExtension  extends CanvasExtension {
  isEnabled() { return this.plugin.settings.getSetting('zOrderingFeatureEnabled') }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeContextMenu,
      (menu: Menu, node: CanvasNode) => this.nodeContextMenu(node, menu)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.SelectionContextMenu,
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

    if (this.plugin.settings.getSetting('zOrderingShowOneLayerShiftOptions')) {
      menu.addItem(item => {
        item.setTitle('Move one layer forward')
        item.setIcon('arrow-up')
        item.onClick(() => this.moveOneLayer(canvas, nodes, true))
      })

      menu.addItem(item => {
        item.setTitle('Move one layer backward')
        item.setIcon('arrow-down')
        item.onClick(() => this.moveOneLayer(canvas, nodes, false))
      })
    }

    menu.addItem(item => {
      item.setTitle('Bring to Front')
      item.setIcon('bring-to-front')
      item.onClick(() => this.bringToFront(canvas, nodes))
    })

    menu.addItem(item => {
      item.setTitle('Send to Back')
      item.setIcon('send-to-back')
      item.onClick(() => this.sendToBack(canvas, nodes))
    })

    menu.addSeparator()
  }

  private moveOneLayer(canvas: Canvas, nodes: CanvasNode[], up: boolean) {
    const otherZIndexes = [...this.getAllZIndexes(canvas)]

    for (const node of nodes) {
      const nextZIndex = up ? 
        (Math.min(...otherZIndexes.filter(z => z > node.zIndex)) + 1) :
        (Math.max(...otherZIndexes.filter(z => z < node.zIndex)) - 1)
      
      if (nextZIndex === Infinity || nextZIndex === -Infinity) continue // Already in front or back
      this.setNodesZIndex([node], nextZIndex)
    }
  }

  private bringToFront(canvas: Canvas, nodes: CanvasNode[] = []) {
    const maxZIndex = Math.max(...this.getAllZIndexes(canvas)) + 1
    this.setNodesZIndex(nodes, maxZIndex)
  }

  private sendToBack(canvas: Canvas, nodes: CanvasNode[] = []) {
    const minZIndex = Math.min(...this.getAllZIndexes(canvas)) - 1
    this.setNodesZIndex(nodes, minZIndex)
  }

  private setNodesZIndex(nodes: CanvasNode[], zIndex: number) {
    console.log('Setting z-index', zIndex, 'for nodes', nodes)

    for (const node of nodes) {
      node.zIndex = zIndex
      node.nodeEl.style.zIndex = zIndex.toString()
    }
  }

  private getAllZIndexes(canvas: Canvas) {
    return [...canvas.nodes.values()].map(n => n.zIndex)
  }
}