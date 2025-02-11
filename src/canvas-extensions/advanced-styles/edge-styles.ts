import { BBox, Canvas, CanvasEdge, CanvasNode, Position, Side } from "src/@types/Canvas"
import { CanvasEvent, PluginEvent } from "src/events"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../canvas-extension"
import EdgePathfindingMethod from "./edge-pathfinding-methods/edge-pathfinding-method"
import EdgePathfindingAStar from "./edge-pathfinding-methods/pathfinding-a-star"
import EdgePathfindingDirect from "./edge-pathfinding-methods/pathfinding-direct"
import EdgePathfindingSquare from "./edge-pathfinding-methods/pathfinding-square"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, StyleAttribute } from "./style-config"

const EDGE_PATHFINDING_METHODS: { [key: string]: new() => EdgePathfindingMethod } = {
  'direct': EdgePathfindingDirect,
  'square': EdgePathfindingSquare,
  'a-star': EdgePathfindingAStar
}

const MAX_LIVE_UPDATE_SELECTION_SIZE = 5
export default class EdgeStylesExtension extends CanvasExtension {
  allEdgeStyleAttributes: StyleAttribute[]

  isEnabled() { return 'edgesStylingFeatureEnabled' as const }

  init() {
    this.allEdgeStyleAttributes = [...BUILTIN_EDGE_STYLE_ATTRIBUTES, ...this.plugin.settings.getSetting('customEdgeStyleAttributes')]
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      PluginEvent.SettingsChanged,
      () => this.allEdgeStyleAttributes = [...BUILTIN_EDGE_STYLE_ATTRIBUTES, ...this.plugin.settings.getSetting('customEdgeStyleAttributes')]
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeCenterRequested,
      (canvas: Canvas, edge: CanvasEdge, center: Position) => this.onEdgeCenterRequested(canvas, edge, center)
    ))

    // TODO: Could be optimized and ignore initial node creation
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeAdded,
      (canvas: Canvas, node: CanvasNode) => this.updateAllEdgesInArea(canvas, node.getBBox())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeMoved,
      // Only update edges this way if a node got moved with the arrow keys
      (canvas: Canvas, node: CanvasNode, keyboard: boolean) => node.initialized && keyboard ? this.updateAllEdgesInArea(canvas, node.getBBox()) : void 0
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeRemoved,
      (canvas: Canvas, node: CanvasNode) => this.updateAllEdgesInArea(canvas, node.getBBox())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DraggingStateChanged,
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

  // Skip if isDragging and setting isn't enabled
  private shouldUpdateEdge(canvas: Canvas): boolean {
    return !canvas.isDragging || this.plugin.settings.getSetting('edgeStyleUpdateWhileDragging') || canvas.canvasEl.hasClass('is-connecting')
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    if (canvas.readonly || selectedEdges.length === 0 || selectedEdges.length !== canvas.selection.size)
      return

    CanvasHelper.addStyleAttributesToPopup(
      this.plugin, canvas, this.allEdgeStyleAttributes,
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
          [attribute.datasetKey]: value
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

    if (!this.shouldUpdateEdge(canvas) && canvas.selection.size > MAX_LIVE_UPDATE_SELECTION_SIZE) return

    const edgeData = edge.getData()
    
    // Reset path to default
    if (!edge.bezier) return
    edge.center = undefined
    edge.updatePath()

    // Set pathfinding method
    const pathfindingMethod = edgeData.styleAttributes?.pathfindingMethod
    if (pathfindingMethod) {
      const fromBBoxSidePos = BBoxHelper.getCenterOfBBoxSide(edge.from.node.getBBox(), edge.from.side)
      const fromPos = edge.from.end === 'none' ? 
        fromBBoxSidePos :
        edge.bezier.from
      
      const toBBoxSidePos = BBoxHelper.getCenterOfBBoxSide(edge.to.node.getBBox(), edge.to.side)
      const toPos = edge.to.end === 'none' ? 
        toBBoxSidePos :
        edge.bezier.to

      const path = new EDGE_PATHFINDING_METHODS[pathfindingMethod]().getPath(this.plugin, canvas, fromPos, fromBBoxSidePos, edge.from.side, toPos, toBBoxSidePos, edge.to.side)
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

    // Rotate arrows accordingly
    if (this.plugin.settings.getSetting('edgeStyleDirectRotateArrow')) {
      this.rotateArrows(edge, pathfindingMethod)
    }
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
    else // Default triangle
      return `0,0 6.5,10.4 -6.5,10.4`
  }

  private rotateArrows(edge: CanvasEdge, pathRouteType?: string | null) {
    // Reset arrow rotation
    if (pathRouteType !== 'direct') {
      if (edge.fromLineEnd?.el) edge.fromLineEnd.el.style.translate = ""
      if (edge.toLineEnd?.el) edge.toLineEnd.el.style.translate = ""

      return
    }
    
    const setArrowRotation = (element: HTMLElement, side: Side, rotation: number) => {
      element.style.transform = element.style.transform
        .replace(/rotate\([-\d]+(deg|rad)\)/g, `rotate(${rotation}rad)`)

      const offset = BBoxHelper.getSideVector(side)
      element.style.translate = `${offset.x * 7}px ${offset.y * -7}px`
    }

    const edgeRotation = Math.atan2(edge.bezier.to.y - edge.bezier.from.y, edge.bezier.to.x - edge.bezier.from.x) - (Math.PI / 2)

    if (edge.fromLineEnd?.el) setArrowRotation(edge.fromLineEnd.el, edge.from.side, edgeRotation)
    if (edge.toLineEnd?.el) setArrowRotation(edge.toLineEnd.el, edge.to.side, edgeRotation - Math.PI)
  }
}