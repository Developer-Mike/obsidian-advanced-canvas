import { around } from "monkey-around"
import { setIcon, setTooltip } from "obsidian"
import AdvancedCanvasPlugin from "src/main"
import { BBox, scaleBBox } from "src/utils/bbox-helper"

export default abstract class CanvasExtension {
  plugin: AdvancedCanvasPlugin
  _canvas: any
  set canvas(canvas: any) { this._canvas = canvas }
  get canvas() {
    if (this._canvas == null) this._canvas = this.plugin.getCurrentCanvas()
    return this._canvas
  }

  abstract onCardMenuCreated(): void
  abstract onPopupMenuCreated(): void
  abstract onNodeChanged(node: any): void

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', () => this.initLayout()))
    this.initLayout()

    this.plugin.app.workspace.onLayoutReady(() => {
      const success = this.initPopupMenuListener()
      if (success) return

      const layoutChangeListener = this.plugin.app.workspace.on('layout-change', () => {
        const success = this.initPopupMenuListener()
        if (success) this.plugin.app.workspace.offref(layoutChangeListener)
      })
      this.plugin.registerEvent(layoutChangeListener)
    })
  }

  private initPopupMenuListener(): boolean {
    const canvasPopupMenu = this.canvas?.menu
    if (!canvasPopupMenu) return false

    const that = this
    const popupMenuUninstaller = around(canvasPopupMenu.constructor.prototype, {
      render: (next: any) =>
        function (...args: any) {
          const result = next.call(this, ...args)

          that.onPopupMenuCreated()
          next.call(this)
          
          return result
        }
    })
    this.plugin.register(popupMenuUninstaller)

    return true
  }

  private initLayout() {
    this.canvas = this.plugin.getCurrentCanvas()
    if (!this.canvas) return

    this.onCardMenuCreated()
    this.initNodes()
  }

  private initNodes() {
    for (const  [_, node] of this.canvas?.nodes) {
      this.onNodeChanged(node)
    }
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

  addCardMenuOption(element: HTMLElement) {
    this.canvas.cardMenuEl.querySelector(`#${element.id}`)?.remove()
    this.canvas.cardMenuEl.appendChild(element)
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

  addPopupMenuOption(element: HTMLElement) {
    const popupMenuEl = this.canvas?.menu?.menuEl
    if (!popupMenuEl) return

    popupMenuEl.querySelector(`#${element.id}`)?.remove()
    popupMenuEl.appendChild(element)
  }

  setNodeUnknownData(node: any, key: string, value: any) {
    node.unknownData[key] = value

    this.onNodeChanged(node)
    this.canvas.requestSave()
  }

  getCenterCoordinates(nodeSize: { width: number, height: number }): { x: number, y: number } {
    const viewBounds = this.canvas.getViewportBBox()

    return { 
      x: (viewBounds.minX + viewBounds.maxX) / 2 - nodeSize.width / 2,
      y: (viewBounds.minY + viewBounds.maxY) / 2 - nodeSize.height / 2,
    }
  }

  zoomToBBox(bbox: BBox) {
    const PADDING_CORRECTION_FACTOR = 1 / 1.1
    const zoomedBBox = scaleBBox(bbox, PADDING_CORRECTION_FACTOR)

    this.canvas.zoomToBbox(zoomedBBox)
    
    // Calculate zoom factor without clamp
    const scaleFactor = Math.min(
      this.canvas.canvasRect.width / (bbox.maxX - bbox.minX),
      this.canvas.canvasRect.height / (bbox.maxY - bbox.minY)
    )

    this.canvas.tZoom = Math.log2(scaleFactor)
  }
}