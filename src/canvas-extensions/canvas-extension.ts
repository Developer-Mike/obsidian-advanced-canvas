import { setIcon } from "obsidian"

export interface MenuOption {
  id: string
  icon: () => string
  label: string,
  callback?: () => void
}

export default abstract class CanvasExtension {
  plugin: any
  canvas: any
  private observer: MutationObserver

  abstract renderMenu(): void
  abstract renderNode(node: any): void

  constructor(plugin: any) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', this.onActiveLeafChange.bind(this)))
    this.onActiveLeafChange()
  }

  destroy() {
    this.observer.disconnect()
  }

  private onActiveLeafChange() {
    this.canvas = this.plugin.getCurrentCanvas()
    if (this.canvas == null) return

    this.renderMenu()
    this.observeCanvas()
    this.renderNodes()
  }

  private observeCanvas() {
    const observe = () => {
      this.observer.observe(this.canvas.canvasEl, { childList: true, subtree: true, attributes: false })
    }

    this.observer = new MutationObserver((mutations: any) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue
        if (mutation.addedNodes.length === 0) continue

        this.observer.disconnect()
        this.renderNodes()
        observe()
      }
    })

    observe()
  }

  private renderNodes() {
    for (const  [_, node] of this.canvas.nodes) {
      this.renderNode(node)
    }
  }

  createMenuOption(id: string, label: string, icon: string, callback?: () => void): HTMLElement {
    const menuOption = document.createElement('div')
    menuOption.id = id
    menuOption.classList.add('canvas-card-menu-button')
    menuOption.setAttribute('aria-label', label)
    menuOption.setAttribute('data-tooltip-position', 'top')
    menuOption.addEventListener('click', () => callback?.())
    setIcon(menuOption, icon)

    return menuOption
  }

  addMenuOption(element: HTMLElement) {
    this.canvas.cardMenuEl.querySelector(`#${element.id}`)?.remove()
    this.canvas.cardMenuEl.appendChild(element)
  }

  getCenterCoordinates(nodeSize: { width: number, height: number }): { x: number, y: number } {
    const viewBounds = this.canvas.getViewportBBox()

    return { 
      x: (viewBounds.minX + viewBounds.maxX) / 2 - nodeSize.width / 2,
      y: (viewBounds.minY + viewBounds.maxY) / 2 - nodeSize.height / 2,
    }
  }
}