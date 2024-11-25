import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../core/canvas-extension"
import CanvasHelper from "src/utils/canvas-helper"

export default class ToolsCanvasExtension  extends CanvasExtension {
  isEnabled() { return this.plugin.settings.getSetting('toolsFeatureEnabled') }

  private readonly TOOLS = [
    {
      id: 'hand-tool',
      name: 'Hand Tool',
      icon: 'hand',
      shortcutKey: this.plugin.settings.getSetting('toolsShortcutKeys').hand,
      enable: (canvas: Canvas) => {
        const moverOverlay = document.createElement("div")
        moverOverlay.id = "canvas-mover-overlay"
        moverOverlay.classList.add("canvas-mover")
        moverOverlay.addEventListener("pointerdown", (e: PointerEvent) => {
          const touchesSelectedEl = document.elementsFromPoint(e.clientX, e.clientY).some(el =>
            el.matches(".canvas-node.is-focused") || el.matches(".canvas-node.is-selected") || el.matches(".canvas-selection")
          )
          if (touchesSelectedEl) return

          canvas.handleMoverPointerdown(e)
        })

        canvas.wrapperEl.appendChild(moverOverlay)
      },
      disable: (_canvas: Canvas) => {
        const moverOverlay = document.getElementById("canvas-mover-overlay")
        if (moverOverlay) moverOverlay.remove()
      }
    },
    {
      id: 'select-tool',
      name: 'Select Tool',
      icon: 'mouse-pointer',
      shortcutKey: this.plugin.settings.getSetting('toolsShortcutKeys').select,
      enable: (_canvas: Canvas) => { },
      disable: (_canvas: Canvas) => { }
    }
  ] as const


  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  private onCanvasChanged(canvas: Canvas) {
    this.createControlGroup(canvas)

    // Add keyboard shortcuts listeners
    canvas.wrapperEl.addEventListener('keydown', (e: KeyboardEvent) => {
      const tool = this.TOOLS.find(tool => tool.shortcutKey === e.key)
      if (!tool) return

      this.setActiveTool(canvas, tool.id)
      e.preventDefault()
    })
  }

  private createControlGroup(canvas: Canvas) {
    const previousControlGroup = canvas.canvasControlsEl.firstChild as HTMLElement | null
    if (!previousControlGroup) return

    const toolsControlGroup = CanvasHelper.createAndAddControlMenuGroup(
      previousControlGroup,
      'tools'
    )

    canvas.toolEls = this.TOOLS.map(tool => CanvasHelper.createControlMenuButton({
      id: tool.id,
      label: this.getToolName(tool.name, tool.shortcutKey),
      icon: tool.icon,
      callback: () => this.setActiveTool(canvas, tool.id)
    }))

    canvas.toolEls.forEach(button => 
      CanvasHelper.addControlMenuButton(toolsControlGroup, button)
    )

    this.setActiveTool(canvas, 'select-tool')
  }

  private getToolName(name: string, shortcutKey: string) {
    return `${name} (${shortcutKey || 'undefined'})`
  }

  private getActiveTool(canvas: Canvas) {
    return this.TOOLS.find(tool => tool.id === canvas.activeTool)
  }

  private setActiveTool(canvas: Canvas, toolId: string) {
    if (canvas.activeTool === toolId) return

    this.getActiveTool(canvas)?.disable(canvas)
    canvas.activeTool = toolId
    this.getActiveTool(canvas)?.enable(canvas)

    canvas.toolEls.forEach(button => {
      if (button.id === toolId) button.classList.add('active')
      else button.classList.remove('active')
    })
  }
}