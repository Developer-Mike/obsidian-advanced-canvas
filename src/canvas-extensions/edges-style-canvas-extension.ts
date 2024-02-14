import { Canvas, CanvasEdge } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/events/events"

const STYLES_MENU_OPTIONS: CanvasHelper.MenuOption[] = [
  {
    id: undefined,
    label: 'Default',
    icon: 'minus'
  },
  {
    id: 'long-dashed',
    label: 'Dashed (long)',
    icon: 'long-dashed-line'
  },
  {
    id: 'short-dashed',
    label: 'Dashed',
    icon: 'short-dashed-line'
  },
  {
    id: 'dotted',
    label: 'Dotted',
    icon: 'dotted-line'
  }
]

const ROUTES_MENU_OPTIONS: CanvasHelper.MenuOption[] = [
  {
    id: undefined,
    label: 'Default',
    icon: 'route'
  },
  {
    id: 'direct',
    label: 'Direct',
    icon: 'minus'
  },
  {
    id: 'a-star',
    label: 'A*',
    icon: 'navigation'
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

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(canvas, edge)
    ))
  }

  onPopupMenuCreated(canvas: Canvas): void {
    // If the canvas is readonly or there is no edge in the selection, return
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    if (canvas.readonly || selectedEdges.length === 0)
      return

    // Path styles
    const pathStyleNestedOptions = STYLES_MENU_OPTIONS.map((style) => ({
      ...style,
      id: undefined,
      callback: () => this.setStyleForSelection(canvas, selectedEdges, style.id)
    }))

    const pathStyleMenuOption = CanvasHelper.createExpandablePopupMenuOption({
      id: 'edge-style-option',
      label: 'Edge style',
      icon: 'paintbrush',
    }, pathStyleNestedOptions)

    // Add menu option to menu bar
    CanvasHelper.addPopupMenuOption(canvas, pathStyleMenuOption)

    const pathRouteNestedOptions = ROUTES_MENU_OPTIONS.map((route) => ({
      ...route,
      id: undefined,
      callback: () => this.setPathRouteForSelection(canvas, selectedEdges, route.id)
    }))

    const pathRouteMenuOption = CanvasHelper.createExpandablePopupMenuOption({
      id: 'edge-path-route-option',
      label: 'Edge path route',
      icon: 'route',
    }, pathRouteNestedOptions)

    // Add menu option to menu bar
    CanvasHelper.addPopupMenuOption(canvas, pathRouteMenuOption)
  }

  private setStyleForSelection(canvas: Canvas, selectedEdges: CanvasEdge[], styleId: string|undefined) {
    for (const edge of selectedEdges) {
      canvas.setEdgeData(edge, 'edgeStyle', styleId)
    }
  }

  private setPathRouteForSelection(canvas: Canvas, selectedEdges: CanvasEdge[], pathRouteTypeId: string|undefined) {
    for (const edge of selectedEdges) {
      canvas.setEdgeData(edge, 'edgePathRoute', pathRouteTypeId)
    }
  }

  private onEdgeChanged(_canvas: Canvas, edge: CanvasEdge) {
    if (!edge.bezier) return
    const pathRouteType = edge.getData().edgePathRoute

    let newPath = edge.bezier.path
    if (pathRouteType === 'direct') {
      newPath = `M${edge.bezier.from.x} ${edge.bezier.from.y} L${edge.bezier.to.x} ${edge.bezier.to.y}`
    }
    
    edge.path.interaction.setAttr("d", newPath)
    edge.path.display.setAttr("d", newPath)
  }
}