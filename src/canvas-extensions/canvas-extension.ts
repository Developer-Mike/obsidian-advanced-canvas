import { around } from "monkey-around"
import { setIcon, setTooltip } from "obsidian"
import AdvancedCanvasPlugin from "src/main"
import { Canvas, CanvasNode } from "src/types/Canvas"
import { BBox, scaleBBox } from "src/utils/bbox-helper"

export default abstract class CanvasExtension {
  plugin: AdvancedCanvasPlugin
  _canvas: Canvas
  set canvas(canvas: Canvas) { this._canvas = canvas }
  get canvas() {
    if (this._canvas == null) this._canvas = this.plugin.getCurrentCanvas()
    return this._canvas
  }

  abstract onCardMenuCreated(): void
  abstract onPopupMenuCreated(): void
  abstract onNodeChanged(node: CanvasNode): void

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', () => this.initLayout()))
    this.initLayout()

    const that = this

    // Patch canvas undo/redo and the handlePaste function
    this.patchWorkspaceFunction(() => this.canvas, {
      undo: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.updateAllNodes()

        return result
      },
      redo: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.updateAllNodes()

        return result
      },
      handlePaste: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        console.log('Pasted', ...args)
        that.updateAllNodes()

        return result
      }
    })

    // Patch popup menu
    this.patchWorkspaceFunction(() => this.canvas.menu, {
      render: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.onPopupMenuCreated()
        next.call(this)
        
        return result
      }
    })
  }

  patchWorkspaceFunction(getTarget: () => any, functions: { [key: string]: (next: any) => (...args: any) => any }) {
    const tryPatch = () => {
      const target = getTarget()
  
      const uninstaller = around(target.constructor.prototype, functions)
      this.plugin.register(uninstaller)
  
      return true
    }
  
    const successful = tryPatch()
    if (successful) return
  
    const listener = this.plugin.app.workspace.on('layout-change', () => {
      const successful = tryPatch()
      if (successful) this.plugin.app.workspace.offref(listener)
    })
  
    this.plugin.registerEvent(listener)
  }

  private initLayout() {
    this.canvas = this.plugin.getCurrentCanvas()
    if (!this.canvas) return

    this.onCardMenuCreated()
    this.updateAllNodes()
  }

  private updateAllNodes() {
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

  setNodeUnknownData(node: CanvasNode, key: string, value: any) {
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