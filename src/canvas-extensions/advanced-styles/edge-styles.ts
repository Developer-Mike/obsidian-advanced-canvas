import { BBox, Canvas, CanvasEdge, CanvasNode, Position } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../canvas-extension"
import EdgePathfindingMethod from "./edge-pathfinding-methods/edge-pathfinding-method"
import EdgePathfindingAStar from "./edge-pathfinding-methods/pathfinding-a-star"
import EdgePathfindingDirect from "./edge-pathfinding-methods/pathfinding-direct"
import EdgePathfindingSquare from "./edge-pathfinding-methods/pathfinding-square"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, StyleAttribute, styleAttributeValidator } from "./style-config"
import CssStylesConfigManager from "src/managers/css-styles-config-manager"

const EDGE_PATHFINDING_METHODS: { [key: string]: typeof EdgePathfindingMethod } = {
  'direct': EdgePathfindingDirect,
  'square': EdgePathfindingSquare,
  'a-star': EdgePathfindingAStar
}

const MAX_LIVE_UPDATE_SELECTION_SIZE = 5
export default class EdgeStylesExtension extends CanvasExtension {
  cssStylesManager: CssStylesConfigManager<StyleAttribute>

  isEnabled() { return 'edgesStylingFeatureEnabled' as const }

  init() {
    this.cssStylesManager = new CssStylesConfigManager(this.plugin, 'advanced-canvas-edge-style', styleAttributeValidator)

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-changed',
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-center-requested',
      (canvas: Canvas, edge: CanvasEdge, center: Position) => this.onEdgeCenterRequested(canvas, edge, center)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-added',
      (canvas: Canvas, node: CanvasNode) => {
        if (canvas.dirty.size > 1 && !canvas.isPasting) return // Skip if multiple nodes are added at once (e.g. on initial load)
        
        this.updateAllEdgesInArea(canvas, node.getBBox())
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-moved',
      // Only update edges this way if a node got moved with the arrow keys
      (canvas: Canvas, node: CanvasNode, keyboard: boolean) => node.initialized && keyboard ? this.updateAllEdgesInArea(canvas, node.getBBox()) : void 0
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-removed',
      (canvas: Canvas, node: CanvasNode) => this.updateAllEdgesInArea(canvas, node.getBBox())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:dragging-state-changed',
      (canvas: Canvas, isDragging: boolean) => {
        if (isDragging) return

        const selectedNodes = canvas.getSelectionData().nodes
          .map(nodeData => canvas.nodes.get(nodeData.id))
          .filter(node => node !== undefined) as CanvasNode[]
        const selectedNodeBBoxes = selectedNodes.map(node => node.getBBox())
        const selectedNodeBBox = BBoxHelper.combineBBoxes(selectedNodeBBoxes)

        this.updateAllEdgesInArea(canvas, selectedNodeBBox)
      }
    ))
  }

  // Skip if isDragging and setting isn't enabled and not connecting an edge
  private shouldUpdateEdge(canvas: Canvas): boolean {
    return !canvas.isDragging || this.plugin.settings.getSetting('edgeStyleUpdateWhileDragging') || canvas.canvasEl.hasClass('is-connecting')
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    if (canvas.readonly || selectedEdges.length === 0 || selectedEdges.length !== canvas.selection.size)
      return

    CanvasHelper.addStyleAttributesToPopup(
      this.plugin, canvas,  [...BUILTIN_EDGE_STYLE_ATTRIBUTES, /* Legacy */ ...this.plugin.settings.getSetting('customEdgeStyleAttributes'), ...this.cssStylesManager.getStyles()],
      selectedEdges[0].getData().styleAttributes ?? {},
      (attribute, value) => this.setStyleAttributeForSelection(canvas, attribute, value)
    )
  }

  private setStyleAttributeForSelection(canvas: Canvas, attribute: StyleAttribute, value: string | null): void {
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]

    for (const edge of selectedEdges) {
      const edgeData = edge.getData()

      edge.setData({
        ...edgeData,
        styleAttributes: {
          ...edgeData.styleAttributes,
          [attribute.key]: value
        }
      })
    }
    
    canvas.pushHistory(canvas.getData())
  }

  private updateAllEdgesInArea(canvas: Canvas, bbox: BBox) {
    if (!this.shouldUpdateEdge(canvas)) return

    for (const edge of canvas.edges.values()) {
      if (!BBoxHelper.isColliding(edge.getBBox(), bbox)) continue

      canvas.markDirty(edge)
    }
  }

  private onEdgeChanged(canvas: Canvas, edge: CanvasEdge) {
    // Skip if edge isn't dirty or selected
    if (!canvas.dirty.has(edge) && !canvas.selection.has(edge)) return

    if (!this.shouldUpdateEdge(canvas)) {
      const tooManySelected = canvas.selection.size > MAX_LIVE_UPDATE_SELECTION_SIZE
      if (tooManySelected) return

      const groupNodesSelected = [...canvas.selection].some((item: any) => item.getData()?.type === 'group')
      if (groupNodesSelected) return
    }

    const edgeData = edge.getData()
    
    // Reset path to default
    if (!edge.bezier) return
    edge.center = undefined
    edge.updatePath()

    // Set pathfinding method
    const pathfindingMethod = edgeData.styleAttributes?.pathfindingMethod
    if (pathfindingMethod && pathfindingMethod in EDGE_PATHFINDING_METHODS) {
      const fromNodeBBox = edge.from.node.getBBox()
      const fromBBoxSidePos = BBoxHelper.getCenterOfBBoxSide(fromNodeBBox, edge.from.side)
      const fromPos = edge.from.end === 'none' ? 
        fromBBoxSidePos :
        edge.bezier.from
      
      const toNodeBBox = edge.to.node.getBBox()
      const toBBoxSidePos = BBoxHelper.getCenterOfBBoxSide(toNodeBBox, edge.to.side)
      const toPos = edge.to.end === 'none' ? 
        toBBoxSidePos :
        edge.bezier.to

      const path = new (EDGE_PATHFINDING_METHODS[pathfindingMethod] as any)(
        this.plugin, 
        canvas, 
        fromNodeBBox, fromPos, fromBBoxSidePos, edge.from.side, 
        toNodeBBox, toPos, toBBoxSidePos, edge.to.side
      ).getPath()
      if (!path) return

      edge.center = path.center
      edge.path.interaction.setAttr("d", path?.svgPath)
      edge.path.display.setAttr("d", path?.svgPath)
    }

    // Update label position
    edge.labelElement?.render()

    // Set arrow polygon
    const arrowPolygonPoints = this.getArrowPolygonPoints(edgeData.styleAttributes?.arrow)
    if (edge.fromLineEnd?.el) edge.fromLineEnd.el.querySelector('polygon')?.setAttribute('points', arrowPolygonPoints)
    if (edge.toLineEnd?.el) edge.toLineEnd.el.querySelector('polygon')?.setAttribute('points', arrowPolygonPoints)
  }

  private onEdgeCenterRequested(_canvas: Canvas, edge: CanvasEdge, center: Position) {
    center.x = edge.center?.x ?? center.x
    center.y = edge.center?.y ?? center.y
  }

  private getArrowPolygonPoints(arrowStyle?: string | null): string {
    if (arrowStyle === 'halved-triangle')
      return `-2,0 7.5,12 -2,12`
    else if (arrowStyle === 'thin-triangle')
      return `0,0 7,10 0,0 0,10 0,0 -7,10`
    else if (arrowStyle === 'diamond' || arrowStyle === 'diamond-outline')
      return `0,0 5,10 0,20 -5,10`
    else if (arrowStyle === 'circle' || arrowStyle === 'circle-outline')
      return `0 0, 4.95 1.8, 7.5 6.45, 6.6 11.7, 2.7 15, -2.7 15, -6.6 11.7, -7.5 6.45, -4.95 1.8`
    else if (arrowStyle === 'blunt')
      return `-10,8 10,8 10,6 -10,6`
    else // Default triangle
      return `0,0 6.5,10.4 -6.5,10.4`
  }
}