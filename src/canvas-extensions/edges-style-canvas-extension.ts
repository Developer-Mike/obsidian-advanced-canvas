import { Canvas, CanvasEdge } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/events/events"

interface EdgeStyle {
  id: string|null
  menuName: string
  icon: string
}

const STYLES: EdgeStyle[] = [
  {
    id: null,
    menuName: 'Default',
    icon: 'minus'
  },
  {
    id: 'long-dashed',
    menuName: 'Dashed (long)',
    icon: 'long-dashed-line'
  },
  {
    id: 'short-dashed',
    menuName: 'Dashed',
    icon: 'short-dashed-line'
  },
  {
    id: 'dotted',
    menuName: 'Dotted',
    icon: 'dotted-line'
  }
]

export default class EdgesStyleCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('edgesStylingFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  onPopupMenuCreated(canvas: Canvas): void {
    // If the canvas is readonly or there is no edge in the selection, return
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    if (canvas.readonly || selectedEdges.length === 0)
      return

    const nestedMenuOptions = STYLES.map((style) => ({
      label: style.menuName,
      icon: style.icon,
      callback: () => this.setStyleForSelection(canvas, selectedEdges, style)
    }))

    const menuOption = CanvasHelper.createExpandablePopupMenuOption({
      id: 'edge-style-option',
      label: 'Edge style',
      icon: 'paintbrush',
    }, nestedMenuOptions)

    // Add menu option to menu bar
    CanvasHelper.addPopupMenuOption(canvas, menuOption)
  }

  private setStyleForSelection(canvas: Canvas, selectedEdges: CanvasEdge[], style: EdgeStyle) {
    for (const edge of selectedEdges) {
      canvas.setEdgeData(edge, 'edgeStyle', style.id)
    }
  }
}