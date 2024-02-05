import { setIcon, setTooltip } from "obsidian"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import { Canvas, CanvasNode } from "src/types/Canvas"
import { BBox, scaleBBox } from "src/utils/bbox-helper"

export default abstract class CanvasExtension {
  plugin: AdvancedCanvasPlugin

  abstract onCanvasChanged(canvas: Canvas): void
  abstract onPopupMenuCreated(canvas: Canvas): void
  abstract onNodesChanged(canvas: Canvas, nodes: CanvasNode[]): void
  abstract onNodeInteraction(canvas: Canvas, node: CanvasNode): void

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    // Register events
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodesChanged,
      (canvas: Canvas, nodes: CanvasNode[]) => this.onNodesChanged(canvas, nodes)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeInteraction,
      (canvas: Canvas, node: CanvasNode) => this.onNodeInteraction(canvas, node)
    ))
  }

  createCardMenuOption(id: string, label: string, icon: string, callback?: () => void): HTMLElement {
    const menuOption = document.createElement('div')
    menuOption.id = id
    menuOption.classList.add('canvas-card-menu-button')
    setIcon(menuOption, icon)
    setTooltip(menuOption, label, { placement: 'top' })
    menuOption.addEventListener('click', () => callback?.())

    return menuOption
  }

  addCardMenuOption(canvas: Canvas, element: HTMLElement) {
    canvas?.cardMenuEl.querySelector(`#${element.id}`)?.remove()
    canvas?.cardMenuEl.appendChild(element)
  }

  createPopupMenuOption(id: string, label: string, icon: string, callback?: () => void): HTMLElement {
    const menuOption = document.createElement('button')
    menuOption.id = id
    menuOption.classList.add('clickable-icon')
    setIcon(menuOption, icon)
    setTooltip(menuOption, label, { placement: 'top' })
    menuOption.addEventListener('click', () => callback?.())

    return menuOption
  }

  addPopupMenuOption(canvas: Canvas, element: HTMLElement) {
    const popupMenuEl = canvas?.menu?.menuEl
    if (!popupMenuEl) return

    popupMenuEl.querySelector(`#${element.id}`)?.remove()
    popupMenuEl.appendChild(element)
  }

  getCenterCoordinates(canvas: Canvas, nodeSize: { width: number, height: number }): { x: number, y: number } {
    const viewBounds = canvas.getViewportBBox()

    return { 
      x: (viewBounds.minX + viewBounds.maxX) / 2 - nodeSize.width / 2,
      y: (viewBounds.minY + viewBounds.maxY) / 2 - nodeSize.height / 2,
    }
  }

  zoomToBBox(canvas: Canvas, bbox: BBox) {
    const PADDING_CORRECTION_FACTOR = 1 / 1.1
    const zoomedBBox = scaleBBox(bbox, PADDING_CORRECTION_FACTOR)

    canvas.zoomToBbox(zoomedBBox)
    
    // Calculate zoom factor without clamp
    const scaleFactor = Math.min(
      canvas.canvasRect.width / (bbox.maxX - bbox.minX),
      canvas.canvasRect.height / (bbox.maxY - bbox.minY)
    )

    canvas.tZoom = Math.log2(scaleFactor)
  }
}