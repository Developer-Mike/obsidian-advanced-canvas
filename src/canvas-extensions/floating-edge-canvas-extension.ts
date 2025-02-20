import { BBox, Canvas, CanvasEdge, CanvasNode, CanvasNodeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/events"
import CanvasExtension from "./canvas-extension"
import BBoxHelper from "src/utils/bbox-helper"

export default class FloatingEdgeCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'floatingEdgeFeatureEnabled' as const }

  private onPointerMove: (e: MouseEvent) => void

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeConnectionDragging.Before,
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to') => this.onEdgeStartedDragging(canvas, edge, event, newEdge, side)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeConnectionDragging.After,
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to') => this.onEdgeStoppedDragging(canvas, edge, event, newEdge, side)
    ))
  }

  onEdgeStartedDragging(canvas: Canvas, edge: CanvasEdge, _event: PointerEvent, newEdge: boolean, _side: 'from' | 'to') {
    if (newEdge && this.plugin.settings.getSetting("newEdgeFromSideFloating")) edge.setData({
      ...edge.getData(),
      fromFloating: true // New edges can only get dragged from the "from" side
    })

    let cachedViewportNodes: [CanvasNode, BBox][] | null = null
    this.onPointerMove = event => {
      if (cachedViewportNodes === null || canvas.viewportChanged) {
        cachedViewportNodes = canvas.getViewportNodes()
          .map(node => [node, this.getFloatingEdgeDropZoneForNode(node)])
      }

      for (const [node, nodeFloatingEdgeDropZoneClientRect] of cachedViewportNodes) {
        const hovering = BBoxHelper.insideBBox({ x: event.clientX, y: event.clientY }, nodeFloatingEdgeDropZoneClientRect, true)
        node.nodeEl.classList.toggle('hovering-floating-edge-zone', hovering) // Update hovering state on node
      }
    }
    document.addEventListener('pointermove', this.onPointerMove) // Listen for pointer move events
  }

  onEdgeStoppedDragging(_canvas: Canvas, edge: CanvasEdge, event: PointerEvent, _newEdge: boolean, side: 'from' | 'to') {
    document.removeEventListener('pointermove', this.onPointerMove) // Stop listening for pointer move events

    const dropZoneNode = side === 'from' ? edge.from.node : edge.to.node
    const floatingEdgeDropZone = this.getFloatingEdgeDropZoneForNode(dropZoneNode)
    if (!BBoxHelper.insideBBox({ x: event.clientX, y: event.clientY }, floatingEdgeDropZone, true))
      return // Edge was not dropped on a floating edge drop zone

    const newEdgeData = edge.getData()
    if (side === 'from') newEdgeData.fromFloating = true
    else newEdgeData.toFloating = true

    edge.setData(newEdgeData)
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