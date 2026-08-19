import { WorkspaceWindow } from "obsidian"
import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

const DEFAULT_COLORS_COUNT = 6

export default class ColorPaletteCanvasExtension extends CanvasExtension {
  observer: MutationObserver | null = null
  private styleSheets: Map<Document, CSSStyleSheet>

  isEnabled() { return true }

  init() {
    this.styleSheets = new Map()

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'window-open',
      (_win: WorkspaceWindow, _window: Window) => this.updateCustomColorModStyleClasses()
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'css-change',
      () => this.updateCustomColorModStyleClasses()
    ))

    this.updateCustomColorModStyleClasses()

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.patchColorSelection(canvas)
    ))

    this.plugin.register(() => {
      this.observer?.disconnect()
      for (const [doc, sheet] of this.styleSheets) {
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter(s => s !== sheet)
      }
      this.styleSheets.clear()
    })
  }

  private updateCustomColorModStyleClasses() {
    const customCss = this.getCustomColors().map((colorId) =>
      `.mod-canvas-color-${colorId} { --canvas-color: var(--canvas-color-${colorId}); }`
    ).join('\n')

    for (const win of this.plugin.windowsManager.windows) {
      const doc = win.activeDocument

      let sheet = this.styleSheets.get(doc)
      if (!sheet) {
        sheet = new CSSStyleSheet()
        doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet]
        this.styleSheets.set(doc, sheet)
      }

      sheet.replaceSync(customCss)
    }
  }

  private patchColorSelection(canvas: Canvas) {
    if (this.observer) this.observer.disconnect()

    this.observer = new MutationObserver(mutations => {
      const colorMenuOpened = mutations.some(mutation =>
        Object.values(mutation.addedNodes).some((node: Node) =>
          node.instanceOf(HTMLElement) && node.classList.contains('canvas-submenu') && Object.values(node.childNodes).some((node: Node) =>
            node.instanceOf(HTMLElement) && node.classList.contains('canvas-color-picker-item')
          )
        )
      )
      if (!colorMenuOpened) return

      const submenu = canvas.menu.menuEl.querySelector('.canvas-submenu')
      if (!submenu) return

      const currentNodeColor = canvas.getSelectionData().nodes.map(node => node.color).last()
      for (const colorId of this.getCustomColors()) {
        const customColorMenuItem = this.createColorMenuItem(canvas, colorId)
        if (currentNodeColor === colorId) customColorMenuItem.classList.add('is-active')

        submenu.insertBefore(customColorMenuItem, submenu.lastChild)
      }
    })

    this.observer.observe(canvas.menu.menuEl, { childList: true })
  }

  private createColorMenuItem(canvas: Canvas, colorId: string) {
    const menuItem = activeWindow.createDiv()
    menuItem.classList.add('canvas-color-picker-item')
    menuItem.classList.add(`mod-canvas-color-${colorId}`)

    menuItem.addEventListener('click', () => {
      menuItem.classList.add('is-active')

      for (const item of canvas.selection) {
        item.setColor(colorId)
      }

      canvas.requestSave()
    })

    return menuItem
  }

  private getCustomColors(): string[] {
    const colors: string[] = []

    const style = getComputedStyle(activeDocument.body)
    let colorIndex = DEFAULT_COLORS_COUNT + 1
    while (style.getPropertyValue(`--canvas-color-${colorIndex}`)) {
      colors.push(colorIndex.toString())
      colorIndex++
    }

    return colors
  }
}
