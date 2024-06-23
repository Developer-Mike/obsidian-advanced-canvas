import { Canvas, CanvasEdge, CanvasNode, Position, Side } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import * as AStarHelper from "src/utils/a-star-helper"
import * as SvgPathHelper from "src/utils/svg-path-helper"
import { CanvasEvent } from "src/core/events"
import * as BBoxHelper from "src/utils/bbox-helper"
import CanvasExtension from "../canvas-extension"
import { DEFAULT_EDGE_STYLE_SETTINGS, StylableAttribute } from "./style-config"
import SettingsManager from "src/settings"

export default class EdgeStylesExtension extends CanvasExtension {
  allEdgeStyles: StylableAttribute[]

  isEnabled() { return 'edgesStylingFeatureEnabled' as const }

  init() {
    this.allEdgeStyles = [...DEFAULT_EDGE_STYLE_SETTINGS, ...this.plugin.settings.getSetting('customEdgeStyleSettings')]
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      SettingsManager.SETTINGS_CHANGED_EVENT,
      () => this.allEdgeStyles = [...DEFAULT_EDGE_STYLE_SETTINGS, ...this.plugin.settings.getSetting('customEdgeStyleSettings')]
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

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeAdded,
      (canvas: Canvas, _node: CanvasNode) => this.updateAllEdges(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeMoved,
      (canvas: Canvas, _node: CanvasNode) => this.updateAllEdges(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeRemoved,
      (canvas: Canvas, _node: CanvasNode) => this.updateAllEdges(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DraggingStateChanged,
      (canvas: Canvas, isDragging: boolean) => {
        if (isDragging || this.plugin.settings.getSetting('edgeStylePathfinderPathLiveUpdate')) return
        this.updateAllEdges(canvas)
      }
    ))
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    if (canvas.readonly || selectedEdges.length === 0 || selectedEdges.length !== canvas.selection.size)
      return

    CanvasHelper.createStyleDropdownMenu(
      canvas, this.allEdgeStyles,
      selectedEdges[0].getData().styleAttributes ?? {},
      (attribute, value) => this.setStyleAttributeForSelection(canvas, attribute, value)
    )
  }

  private setStyleAttributeForSelection(canvas: Canvas, attribute: StylableAttribute, value: string | null): void {
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

  private updateAllEdges(canvas: Canvas) {
    for (const edge of canvas.edges.values()) {
      this.onEdgeChanged(canvas, edge)
    }
  }

  private onEdgeChanged(canvas: Canvas, edge: CanvasEdge) {
    const edgeData = edge.getData()
    
    // Reset path to default
    if (!edge.bezier) return
    edge.updatePath()
    edge.center = undefined

    // Set arrow style
    const arrowPolygonPoints = this.getArrowPolygonPoints(edgeData.styleAttributes?.arrow)

    if (edge.fromLineEnd?.el) edge.fromLineEnd.el.querySelector('polygon')?.setAttribute('points', arrowPolygonPoints)
    if (edge.toLineEnd?.el) edge.toLineEnd.el.querySelector('polygon')?.setAttribute('points', arrowPolygonPoints)

    // Set pathfinding method
    const pathRouteType = edgeData.styleAttributes?.pathfindingMethod
    if (pathRouteType) {
      const fromPos = edge.from.end === 'none' ? 
        BBoxHelper.getCenterOfBBoxSide(edge.from.node.getBBox(), edge.from.side) :
        edge.bezier.from

      const toPos = edge.to.end === 'none' ? 
        BBoxHelper.getCenterOfBBoxSide(edge.to.node.getBBox(), edge.to.side) :
        edge.bezier.to

      let newPath = edge.path.display.getAttribute("d")
    
      if (pathRouteType === 'direct') {
        newPath = SvgPathHelper.pathArrayToSvgPath([fromPos, toPos], false)
        edge.center = {
          x: (fromPos.x + toPos.x) / 2,
          y: (fromPos.y + toPos.y) / 2
        }
      } else if (pathRouteType === 'square') {
        let pathArray: Position[] = []
        if (edge.from.side === 'bottom' || edge.from.side === 'top') {
          pathArray = [
            fromPos, 
            { x: fromPos.x, y: fromPos.y + (toPos.y - fromPos.y) / 2 },
            { x: toPos.x, y: fromPos.y + (toPos.y - fromPos.y) / 2 },
            toPos
          ]
        } else {
          pathArray = [
            fromPos, 
            { x: fromPos.x + (toPos.x - fromPos.x) / 2, y: fromPos.y },
            { x: fromPos.x + (toPos.x - fromPos.x) / 2, y: toPos.y },
            toPos
          ]
        }

        newPath = SvgPathHelper.pathArrayToSvgPath(pathArray, false)
        edge.center = { 
          x: (fromPos.x + toPos.x) / 2, 
          y: (fromPos.y + toPos.y) / 2 
        }
      } else if (pathRouteType === 'a-star') {
        if (canvas.isDragging && !this.plugin.settings.getSetting('edgeStylePathfinderPathLiveUpdate')) return
        
        const nodeBBoxes = [...canvas.nodes.values()]
          .filter(node => {
            const nodeData = node.getData()
            
            const isGroup = nodeData.type === 'group' // Exclude group nodes
            const isOpenPortal = nodeData.portalToFile !== undefined // Exclude open portals
            
            return !isGroup && !isOpenPortal
          }).map(node => node.getBBox())
        
        const fromPosWithMargin = BBoxHelper.moveInDirection(fromPos, edge.from.side, 10)
        const toPosWithMargin = BBoxHelper.moveInDirection(toPos, edge.to.side, 10)

        const gridResolution = this.plugin.settings.getSetting('edgeStylePathfinderGridResolution')
        const pathArray = AStarHelper.aStar(fromPosWithMargin, edge.from.side, toPosWithMargin, edge.to.side, nodeBBoxes, gridResolution)
        if (!pathArray) return // No path found - use default path

        // Make connection points to the node removing the margin
        pathArray.splice(0, 0, fromPos)
        pathArray.splice(pathArray.length, 0, toPos)

        const roundedPath = this.plugin.settings.getSetting('edgeStylePathfinderPathRounded')
        const svgPath = SvgPathHelper.pathArrayToSvgPath(pathArray, roundedPath)

        newPath = svgPath
        edge.center = pathArray[Math.floor(pathArray.length / 2)]
      }
      
      edge.path.interaction.setAttr("d", newPath)
      edge.path.display.setAttr("d", newPath)
    }

    // Update label position
    edge.labelElement?.render()

    // Rotate arrows accordingly
    if (this.plugin.settings.getSetting('edgeStyleDirectRotateArrow')) {
      const edgeRotation = Math.atan2(edge.bezier.to.y - edge.bezier.from.y, edge.bezier.to.x - edge.bezier.from.x) - (Math.PI / 2)
      const setArrowRotation = (element: HTMLElement, side: Side, rotation: number) => {
        element.style.transform = element.style.transform
          .replace(/rotate\([-\d]+(deg|rad)\)/g, `rotate(${rotation}rad)`)

        const offset = BBoxHelper.getSideVector(side)
        element.style.translate = `${offset.x * 7}px ${offset.y * -7}px`
      }

      if (pathRouteType === 'direct') {
        if (edge.fromLineEnd?.el) setArrowRotation(edge.fromLineEnd.el, edge.from.side, edgeRotation)
        if (edge.toLineEnd?.el) setArrowRotation(edge.toLineEnd.el, edge.to.side, edgeRotation - Math.PI)
      } else {
        if (edge.fromLineEnd?.el) edge.fromLineEnd.el.style.translate = ""
        if (edge.toLineEnd?.el) edge.toLineEnd.el.style.translate = ""
      }
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
}