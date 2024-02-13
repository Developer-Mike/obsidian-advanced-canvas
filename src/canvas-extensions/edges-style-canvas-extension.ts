import { Canvas, CanvasEdge, CanvasNode } from "src/@types/Canvas"
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
    id: 'dotted',
    menuName: 'Dotted',
    icon: 'circle'
  },
  {
    id: 'short-dashed',
    menuName: 'Dashed',
    icon: 'oval'
  },
  {
    id: 'long-dashed',
    menuName: 'Dashed (long)',
    icon: 'rectangle-horizontal'
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
    if (canvas.readonly || canvas.getSelectionData().edges.length === 0)
      return

    const nestedMenuOptions = STYLES.map((style) => ({
      id: '',
      label: style.menuName,
      icon: style.icon,
      callback: () => this.setStyleForSelection(canvas, style)
    }))

    const menuOption = CanvasHelper.createExpandablePopupMenuOption({
      id: 'edge-style-option',
      label: 'Edge style',
      icon: 'paintbrush',
    }, nestedMenuOptions)

    // Add menu option to menu bar
    CanvasHelper.addPopupMenuOption(canvas, menuOption)
  }

  private setStyleForSelection(canvas: Canvas, style: EdgeStyle) {  
    for (const edgeData of canvas.getSelectionData().edges) {
      const edge = canvas.edges.get(edgeData.id)
      if (!edge) continue

      canvas.setEdgeData(edge, 'lineStyle', style.id)
    }
  }
}