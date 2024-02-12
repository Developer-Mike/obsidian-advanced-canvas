import { TFile } from "obsidian"
import { BBox, Canvas, CanvasData, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"

const PORTAL_PADDING = 50
const MIN_OPEN_PORTAL_SIZE = { width: 200, height: 200 }

export default class PortalsCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('portalsFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.updatePopupMenu(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeRemoved,
      (canvas: Canvas, node: CanvasNode) => this.onNodeRemoved(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeMoved,
      (canvas: Canvas, node: CanvasNode) => this.onNodeMoved(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DraggingStateChanged,
      (canvas: Canvas, startedDragging: boolean) => this.onDraggingStateChanged(canvas, startedDragging)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.SelectionChanged,
      (canvas: Canvas, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas, updateSelection)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.Undo,
      (canvas: Canvas) => {
        this.getCanvasDataWithPortals(canvas.getData())
          .then((data: CanvasData) => canvas.importData(data))
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.Redo,
      (canvas: Canvas) => {
        this.getCanvasDataWithPortals(canvas.getData())
          .then((data: CanvasData) => canvas.importData(data))
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DataRequested,
      (canvas: Canvas, data: CanvasData) => this.removePortalCanvasData(canvas, data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.LoadData,
      (_canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => {
        this.getCanvasDataWithPortals(data)
          .then((data: CanvasData) => setData(data))
      }
    ))
  }

  private updatePopupMenu(canvas: Canvas) {
    if (canvas.readonly) return

    // Only search for valid nodes
    const selectedFileNodes = Array.from(canvas.selection).filter(node => {
      const nodeData = node.getData()
      if (nodeData.type !== 'file') return false
      if (node.file?.extension === 'canvas') return true

      // Close portal of non-canvas file
      if (nodeData.isPortalOpen) canvas.setNodeData(node, 'isPortalOpen', false)

      return false
    })
    if (selectedFileNodes.length !== 1) return

    const fileNode = selectedFileNodes[0]
    const isPortalOpen = fileNode.getData().isPortalOpen

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption(
        'toggle-portal',
        isPortalOpen ? 'Close portal' : 'Open portal',
        isPortalOpen ? 'door-open' : 'door-closed',
        () => {
          fileNode.setData({
            ...fileNode.getData(),
            isPortalOpen: !isPortalOpen
          })

          this.updatePopupMenu(canvas)

          // Update whole canvas data
          canvas.setData(canvas.getData())
        }
      )
    )
  }

  private onNodeRemoved(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type !== 'file' || !nodeData.isPortalOpen) return

    // Remove nested nodes and edges
    Object.keys(nodeData.portalIdMaps?.nodeIdMap ?? {}).map(refNodeId => canvas.nodes.get(refNodeId))
      .filter(node => node !== undefined)
      .forEach(node => canvas.removeNode(node!))

    Object.keys(nodeData.portalIdMaps?.edgeIdMap ?? {}).map(refEdgeId => canvas.edges.get(refEdgeId))
      .filter(edge => edge !== undefined)
      .forEach(edge => canvas.removeEdge(edge!))
  }

  private onSelectionChanged(canvas: Canvas, updateSelection: (update: () => void) => void) {
    updateSelection(() => {
      const updatedSelection = Array.from(canvas.selection)
        .filter(node => node.getData().portalId === undefined)
      canvas.selection = new Set(updatedSelection)
    })
  }

  restoreObjectSnappingState: () => void
  private onDraggingStateChanged(canvas: Canvas, startedDragging: boolean) {
    // If no open portal gets dragged, return
    if (!canvas.getSelectionData().nodes.some(node => node.type === 'file' && node.isPortalOpen)) return

    // Disable object snapping to fix self-aligning
    if (startedDragging) {
      const objectSnappingEnabled = canvas.options.snapToObjects
      this.restoreObjectSnappingState = () => canvas.toggleObjectSnapping(objectSnappingEnabled)

      if (objectSnappingEnabled) canvas.toggleObjectSnapping(false)
    } else this.restoreObjectSnappingState?.()
  }

  private onNodeMoved(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type !== 'file' || !nodeData.isPortalOpen) return

    this.onOpenPortalMoved(canvas, node)
  }

  private onOpenPortalMoved(canvas: Canvas, portalNode: CanvasNode) {
    const portalNodeData = portalNode.getData()

    // Update nested nodes positions
    const nestedNodesIdMap = portalNode.getData().portalIdMaps?.nodeIdMap
    if (!nestedNodesIdMap) return

    const nestedNodes = Object.keys(nestedNodesIdMap).map(refNodeId => canvas.nodes.get(refNodeId))
      .filter(node => node !== undefined) as CanvasNode[]
    const sourceBBox = CanvasHelper.getBBox(nestedNodes)

    // Resize portal
    const targetSize = this.getPortalSize(sourceBBox)
    if (portalNodeData.width !== targetSize.width || portalNodeData.height !== targetSize.height) {
      portalNode.setData({
        ...portalNodeData,
        width: targetSize.width,
        height: targetSize.height
      })
    }

    // Move nested nodes
    const portalOffset = {
      x: portalNodeData.x - sourceBBox.minX + PORTAL_PADDING,
      y: portalNodeData.y - sourceBBox.minY + PORTAL_PADDING
    }

    for (const nestedNode of nestedNodes) {
      const nestedNodeData = nestedNode.getData()

      nestedNode.setData({
        ...nestedNodeData,
        x: nestedNodeData.x + portalOffset.x,
        y: nestedNodeData.y + portalOffset.y
      })
    }
  }

  private removePortalCanvasData(_canvas: Canvas, data: CanvasData) {
    data.edges = data.edges.filter(edgeData => {
      if (edgeData.portalId !== undefined) return false

      const fromNodeData = data.nodes.find(nodeData => nodeData.id === edgeData.fromNode)
      const toNodeData = data.nodes.find(nodeData => nodeData.id === edgeData.toNode)
      if (!fromNodeData || !toNodeData) return true

      if (fromNodeData.portalId === undefined && toNodeData.portalId === undefined) { // Normal edge
        return true 
      } else if (fromNodeData.portalId !== undefined && toNodeData.portalId !== undefined) { // Completely from portal
        // Save to portal file? OR delete!
        return false
      } else { // Partially from portal
        const fromPortalNodeData = fromNodeData.portalId !== undefined ? fromNodeData : toNodeData
        const notFromPortalNodeData = fromNodeData.portalId !== undefined ? toNodeData : fromNodeData

        notFromPortalNodeData.edgesToNodeFromPortal = notFromPortalNodeData.edgesToNodeFromPortal ?? {}
        notFromPortalNodeData.edgesToNodeFromPortal[fromPortalNodeData.portalId!] = notFromPortalNodeData.edgesToNodeFromPortal[fromPortalNodeData.portalId!] ?? []
        notFromPortalNodeData.edgesToNodeFromPortal[fromPortalNodeData.portalId!].push(edgeData)

        return false
      }
    })

    data.nodes = data.nodes.filter(nodeData => nodeData.portalId === undefined)

    for (const portalNodeData of data.nodes) {
      if (portalNodeData.type !== 'file') continue

      // Reset portal size
      if (this.plugin.settingsManager.getSetting('maintainClosedPortalSize')) {
        portalNodeData.width = portalNodeData.closedPortalWidth ?? portalNodeData.width
        portalNodeData.height = portalNodeData.closedPortalHeight ?? portalNodeData.height
      }

      // Remove references to portal nodes and edges
      delete portalNodeData.closedPortalWidth
      delete portalNodeData.closedPortalHeight
      delete portalNodeData.portalIdMaps
    }
  }

  private async getCanvasDataWithPortals(data: CanvasData): Promise<CanvasData> {
    // Deep copy data - If another file gets opened in the same view, the data would get overwritten
    const dataCopy = JSON.parse(JSON.stringify(data)) as CanvasData

    for (const portalNodeData of dataCopy.nodes) {
      if (portalNodeData.type !== 'file' || !portalNodeData.isPortalOpen) continue

      const portalFile = this.plugin.app.vault.getAbstractFileByPath(portalNodeData.file!)
      if (!(portalFile instanceof TFile) || portalFile.extension !== 'canvas') {
        portalNodeData.isPortalOpen = false
        continue
      }

      const portalData = JSON.parse(await this.plugin.app.vault.cachedRead(portalFile))
      if (!portalData) {
        portalNodeData.isPortalOpen = false
        continue
      }

      // Resize portal
      const sourceBBox = CanvasHelper.getBBox(portalData.nodes)
      const targetSize = this.getPortalSize(sourceBBox)

      // Save closed portal size
      portalNodeData.closedPortalWidth = portalNodeData.width
      portalNodeData.closedPortalHeight = portalNodeData.height

      // Set open portal size
      portalNodeData.width = targetSize.width
      portalNodeData.height = targetSize.height

      // Calculate new node positions
      const portalOffset = {
        x: portalNodeData.x - sourceBBox.minX + PORTAL_PADDING,
        y: portalNodeData.y - sourceBBox.minY + PORTAL_PADDING
      }

      // Add portal nodes and edges
      portalNodeData.portalIdMaps = {
        nodeIdMap: {},
        edgeIdMap: {}
      }

      for (const nodeDataFromPortal of portalData.nodes) {
        const refNodeId = `${nodeDataFromPortal.id}-${nodeDataFromPortal.id}`
        portalNodeData.portalIdMaps.nodeIdMap[refNodeId] = nodeDataFromPortal.id
        
        dataCopy.nodes.push({
          ...nodeDataFromPortal,
          id: refNodeId,
          x: nodeDataFromPortal.x + portalOffset.x,
          y: nodeDataFromPortal.y + portalOffset.y,
          portalId: portalNodeData.id
        })
      }

      for (const edgeDataFromPortal of portalData.edges) {
        const refEdgeId = `${portalNodeData.id}-${edgeDataFromPortal.id}`
        portalNodeData.portalIdMaps.edgeIdMap[refEdgeId] = edgeDataFromPortal.id

        const fromRefNode = Object.entries(portalNodeData.portalIdMaps.nodeIdMap)
          .find(([_refNodeId, nodeId]) => nodeId === edgeDataFromPortal.fromNode)?.[0]
        const toRefNode = Object.entries(portalNodeData.portalIdMaps.nodeIdMap)
          .find(([_refNodeId, nodeId]) => nodeId === edgeDataFromPortal.toNode)?.[0]

        dataCopy.edges.push({
          ...edgeDataFromPortal,
          id: refEdgeId,
          fromNode: fromRefNode,
          toNode: toRefNode,
          portalId: portalNodeData.id
        })
      }
    }

    // Create edges between portal nodes and non-portal nodes
    for (const nodeData of dataCopy.nodes) {
      if (nodeData.edgesToNodeFromPortal === undefined) continue

      for (const [portalId, edges] of Object.entries(nodeData.edgesToNodeFromPortal)) {
        // If portal is deleted, delete edges
        const portalNodeData = dataCopy.nodes.find(nodeData => nodeData.id === portalId)
        if (!portalNodeData) {
          delete nodeData.edgesToNodeFromPortal![portalId]
          continue
        }

        if (portalNodeData.isPortalOpen) { // If portal is open, add edges
          dataCopy.edges.push(...edges)
          delete nodeData.edgesToNodeFromPortal![portalId]
        }

        // If portal is closed, add alternative edges directly to portal
        // But don't delete the edges
        if (!portalNodeData.isPortalOpen && this.plugin.settingsManager.getSetting('showEdgesIntoDisabledPortals')) {
          dataCopy.edges.push(...edges.map(edge => (
            {
              ...edge,
              toNode: portalId,
              portalId: portalId // Mark it as temporary
            }
          )))
        }
      }

      // If no more edges, delete the property
      if (Object.keys(nodeData.edgesToNodeFromPortal!).length === 0) {
        delete nodeData.edgesToNodeFromPortal
      }
    }

    return dataCopy
  }

  private getPortalSize(sourceBBox: BBox) {
    const sourceSize = {
      width: sourceBBox.maxX - sourceBBox.minX,
      height: sourceBBox.maxY - sourceBBox.minY
    }

    const targetSize = {
      width: Math.max(sourceSize.width + PORTAL_PADDING * 2, MIN_OPEN_PORTAL_SIZE.width),
      height: Math.max(sourceSize.height + PORTAL_PADDING * 2, MIN_OPEN_PORTAL_SIZE.height)
    }

    if (!Number.isFinite(targetSize.width)) targetSize.width = MIN_OPEN_PORTAL_SIZE.width
    if (!Number.isFinite(targetSize.height)) targetSize.height = MIN_OPEN_PORTAL_SIZE.height

    return targetSize
  }
}