import { BBox, Canvas, CanvasEdge, CanvasNode, Position } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import BBoxHelper from "src/utils/bbox-helper"
import { Side } from "src/@types/AdvancedJsonCanvas"

export default class FloatingEdgeCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'floatingEdgeFeatureEnabled' as const }

  private onPointerMove: (e: MouseEvent) => void

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-moved',
      (canvas: Canvas, node: CanvasNode) => this.onNodeMoved(canvas, node)
    ))


    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-connection-dragging:before',
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to') => this.onEdgeStartedDragging(canvas, edge, event, newEdge, side)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-connection-dragging:after',
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to') => this.onEdgeStoppedDragging(canvas, edge, event, newEdge, side)
    ))
  }

  private onNodeMoved(canvas: Canvas, node: CanvasNode) {
    const affectedEdges = canvas.getEdgesForNode(node)

    for (const edge of affectedEdges)
      this.updateEdgeConnectionSide(edge)
  }

  private updateEdgeConnectionSide(edge: CanvasEdge) {
    const edgeData = edge.getData()

    if (edgeData.fromFloating) {
      const fixedNodeConnectionPoint = BBoxHelper.getCenterOfBBoxSide(edge.to.node.getBBox(), edge.to.side)
      const bestSide = this.getBestSideForFloatingEdge(fixedNodeConnectionPoint, edge.from.node)

      if (bestSide !== edge.from.side) {
        edge.setData({
          ...edgeData,
          fromSide: bestSide
        })
      }
    }
    
    if (edgeData.toFloating) {
      const fixedNodeConnectionPoint = BBoxHelper.getCenterOfBBoxSide(edge.from.node.getBBox(), edge.from.side)
      const bestSide = this.getBestSideForFloatingEdge(fixedNodeConnectionPoint, edge.to.node)
      
      if (bestSide !== edge.to.side) {
        edge.setData({
          ...edgeData,
          toSide: bestSide
        })
      }
    }
  }

  private getBestSideForFloatingEdge(sourcePos: Position, target: CanvasNode): Side {
    const targetBBox = target.getBBox()

    const possibleSides = ['top', 'right', 'bottom', 'left'] as const
    const possibleTargetPos = possibleSides.map(side => [side, BBoxHelper.getCenterOfBBoxSide(targetBBox, side)]) as [Side, Position][]

    let bestSide: Side | null = null
    let bestDistance = Infinity
    for (const [side, pos] of possibleTargetPos) {
      const distance = Math.sqrt(Math.pow(sourcePos.x - pos.x, 2) + Math.pow(sourcePos.y - pos.y, 2))

      if (distance < bestDistance) {
        bestDistance = distance
        bestSide = side
      }
    }

    return bestSide!
  }

  private onEdgeStartedDragging(canvas: Canvas, edge: CanvasEdge, _event: PointerEvent, newEdge: boolean, _side: 'from' | 'to') {
    if (newEdge && this.plugin.settings.getSetting("newEdgeFromSideFloating")) edge.setData({
      ...edge.getData(),
      fromFloating: true // New edges can only get dragged from the "from" side
    })

    let cachedViewportNodes: [CanvasNode, BBox][] | null = null
    let hasNaNFloatingEdgeDropZones = false
    this.onPointerMove = event => {
      if (cachedViewportNodes === null || hasNaNFloatingEdgeDropZones || canvas.viewportChanged) {
        hasNaNFloatingEdgeDropZones = false

        cachedViewportNodes = canvas.getViewportNodes()
          .map(node => {
            const nodeFloatingEdgeDropZone = this.getFloatingEdgeDropZoneForNode(node)
            if (isNaN(nodeFloatingEdgeDropZone.minX) || isNaN(nodeFloatingEdgeDropZone.minY) || isNaN(nodeFloatingEdgeDropZone.maxX) || isNaN(nodeFloatingEdgeDropZone.maxY))
              hasNaNFloatingEdgeDropZones = true

            return [node, nodeFloatingEdgeDropZone] as [CanvasNode, BBox]
          })
      }

      for (const [node, nodeFloatingEdgeDropZoneClientRect] of cachedViewportNodes) {
        const hovering = BBoxHelper.insideBBox({ x: event.clientX, y: event.clientY }, nodeFloatingEdgeDropZoneClientRect, true)
        node.nodeEl.classList.toggle('hovering-floating-edge-zone', hovering) // Update hovering state on node
      }
    }
    document.addEventListener('pointermove', this.onPointerMove) // Listen for pointer move events
  }

  private onEdgeStoppedDragging(_canvas: Canvas, edge: CanvasEdge, event: PointerEvent, _newEdge: boolean, side: 'from' | 'to') {
    document.removeEventListener('pointermove', this.onPointerMove) // Stop listening for pointer move events

    const dropZoneNode = side === 'from' ? edge.from.node : edge.to.node
    const floatingEdgeDropZone = this.getFloatingEdgeDropZoneForNode(dropZoneNode)
    const wasDroppedInFloatingEdgeDropZone = BBoxHelper.insideBBox({ x: event.clientX, y: event.clientY }, floatingEdgeDropZone, true)

    const edgeData = edge.getData()
    if (side === 'from' && wasDroppedInFloatingEdgeDropZone == edgeData.fromFloating) return
    if (side === 'to' && wasDroppedInFloatingEdgeDropZone == edgeData.toFloating) return

    if (side === 'from') edgeData.fromFloating = wasDroppedInFloatingEdgeDropZone
    else edgeData.toFloating = wasDroppedInFloatingEdgeDropZone

    edge.setData(edgeData)

    this.updateEdgeConnectionSide(edge)
  }

  private getFloatingEdgeDropZoneForNode(node: CanvasNode): BBox {
    const nodeElClientBoundingRect = node.nodeEl.getBoundingClientRect()
    const nodeFloatingEdgeDropZoneElStyle = window.getComputedStyle(node.nodeEl, ':after')
    const nodeFloatingEdgeDropZoneSize = {
      width: parseFloat(nodeFloatingEdgeDropZoneElStyle.getPropertyValue('width')),
      height: parseFloat(nodeFloatingEdgeDropZoneElStyle.getPropertyValue('height'))
    }

    return {
      minX: nodeElClientBoundingRect.left + (nodeElClientBoundingRect.width - nodeFloatingEdgeDropZoneSize.width) / 2,
      minY: nodeElClientBoundingRect.top + (nodeElClientBoundingRect.height - nodeFloatingEdgeDropZoneSize.height) / 2,
      maxX: nodeElClientBoundingRect.right - (nodeElClientBoundingRect.width - nodeFloatingEdgeDropZoneSize.width) / 2,
      maxY: nodeElClientBoundingRect.bottom - (nodeElClientBoundingRect.height - nodeFloatingEdgeDropZoneSize.height) / 2
    }
  }
}