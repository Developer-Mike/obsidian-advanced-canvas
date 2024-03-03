import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"

const DEFAULT_COLORS_COUNT = 6
const CUSTOM_COLORS_MOD_STYLES_ID = 'mod-custom-colors'

export default class ColorPaletteCanvasExtension {
  plugin: AdvancedCanvasPlugin
  observer: MutationObserver|null = null

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'css-change',
      () => this.updateCustomColorModStyleClasses()
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.patchColorSelection(canvas)
    ))

    this.plugin.register(() => this.observer?.disconnect())
  }

  private updateCustomColorModStyleClasses() {
    document.getElementById(CUSTOM_COLORS_MOD_STYLES_ID)?.remove()

    const customColorModStyle = document.createElement('style')
    customColorModStyle.id = CUSTOM_COLORS_MOD_STYLES_ID
    document.body.appendChild(customColorModStyle)

    for (const colorId of this.getCustomColors()) {
      // Add mod-canvas-color-<colorId> style to the css
      customColorModStyle.innerHTML += `
        .mod-canvas-color-${colorId} {
          --canvas-color: var(--canvas-color-${colorId});
        }
      `
    }
  }

  private patchColorSelection(canvas: Canvas) {
    if (this.observer) this.observer.disconnect()

    this.observer = new MutationObserver(mutations => {
      const colorMenuOpened = mutations.some(mutation => 
        Object.values(mutation.addedNodes).some((node: Node) => 
          node instanceof HTMLElement && node.classList.contains('canvas-submenu') && Object.values(node.childNodes).some((node: Node) =>
            node instanceof HTMLElement && node.classList.contains('canvas-color-picker-item')
          )
        )
      )
      if (!colorMenuOpened) return

      const submenu = canvas.menu.menuEl.querySelector('.canvas-submenu')
      if (!submenu) return

      this.updateCustomColorModStyleClasses()

      for (const colorId of this.getCustomColors()) {
        const customColorMenuItem = this.createColorMenuItem(canvas, colorId)
        submenu.insertBefore(customColorMenuItem, submenu.lastChild)
      }
    })

    this.observer.observe(canvas.menu.menuEl, { childList: true })
  }

  private createColorMenuItem(canvas: Canvas, colorId: string) {
    const menuItem = document.createElement('div')
    menuItem.classList.add('canvas-color-picker-item')
    menuItem.classList.add(`mod-canvas-color-${colorId}`)

    menuItem.addEventListener('click', () => {
      for (const item of canvas.selection) {
        item.setColor(colorId)
      }

      canvas.requestSave()
    })

    return menuItem
  }

  private getCustomColors(): string[] {
    const colors: string[] = []

    while (true) {
      const colorId = (DEFAULT_COLORS_COUNT + colors.length + 1).toString()
      if (!getComputedStyle(document.body).getPropertyValue(`--canvas-color-${colorId}`)) break

      colors.push(colorId)
    }

    return colors
  }
}