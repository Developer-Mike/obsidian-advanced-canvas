import { TFile } from "obsidian"
import { BBox, Canvas, CanvasData, CanvasEdge, CanvasElement, CanvasNode, CanvasNodeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import * as CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const PORTAL_PADDING = 50
const MIN_OPEN_PORTAL_SIZE = { width: 200, height: 200 }

export default class PortalsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'portalsFeatureEnabled' as const }

  init() {
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
      CanvasEvent.ContainingNodesRequested,
      (canvas: Canvas, bbox: BBox, nodes: CanvasNode[]) => this.onContainingNodesRequested(canvas, bbox, nodes)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.SelectionChanged,
      (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas, oldSelection, updateSelection)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DataRequested,
      (canvas: Canvas, data: CanvasData) => this.removePortalCanvasData(canvas, data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.LoadData,
      (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => {
        this.getCanvasDataWithPortals(canvas, data)
          .then((newData: CanvasData) => {
            // Skip if the data didn't change
            if (newData.nodes.length === data.nodes.length && newData.edges.length === data.edges.length) return
            setData(newData)
          })
      }
    ))
  }

  private updatePopupMenu(canvas: Canvas) {
    if (canvas.readonly) return

    // Only search for valid nodes
    const selectedFileNodes = canvas.getSelectionData().nodes.map(nodeData => {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) return null

      if (nodeData.type !== 'file') return null
      if (node.file?.extension === 'canvas') return node
      
      // Close portal of non-canvas file
      if (nodeData.portalToFile) this.setPortalOpen(canvas, node, false)

      return null
    }).filter(node => node !== null) as CanvasNode[]
    
    if (selectedFileNodes.length !== 1) return

    const portalNode = selectedFileNodes[0]
    const portalNodeData = portalNode.getData()

    // If file changed
    if (portalNodeData.portalToFile && portalNodeData.file !== portalNodeData.portalToFile) {
      this.setPortalOpen(canvas, portalNode, true)
    }

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'toggle-portal',
        label: portalNodeData.portalToFile ? 'Close portal' : 'Open portal',
        icon: portalNodeData.portalToFile ? 'door-open' : 'door-closed',
        callback: () => {
          this.setPortalOpen(canvas, portalNode, portalNodeData.portalToFile === undefined)
          this.updatePopupMenu(canvas)
        }
      })
    )
  }

  private setPortalOpen(canvas: Canvas, portalNode: CanvasNode, open: boolean) {
    const portalNodeData = portalNode.getData()
    portalNode.setData({
      ...portalNodeData,
      portalToFile: open ? portalNodeData.file : undefined
    })

    // Update whole canvas data
    canvas.setData(canvas.getData())
  }

  private onNodeRemoved(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type !== 'file' || !nodeData.portalToFile) return

    // Remove nested nodes and edges
    Object.keys(nodeData.portalIdMaps?.nodeIdMap ?? {}).map(refNodeId => canvas.nodes.get(refNodeId))
      .filter(node => node !== undefined)
      .forEach(node => canvas.removeNode(node!))

    Object.keys(nodeData.portalIdMaps?.edgeIdMap ?? {}).map(refEdgeId => canvas.edges.get(refEdgeId))
      .filter(edge => edge !== undefined)
      .forEach(edge => canvas.removeEdge(edge!))
  }

  private onEdgeChanged(_canvas: Canvas, edge: CanvasEdge) {
    const isUnsaved = (edge.from.node !== undefined && edge.to.node !== undefined) && // Edge not fully connected
      (edge.from.node.getData().portalId !== undefined && edge.to.node.getData().portalId !== undefined) && // Both nodes are from portal
      edge.getData().portalId === undefined // Edge is not from portal

    edge.setData({
      ...edge.getData(), 
      isUnsaved: isUnsaved ? true : undefined
    })
  }

  private onContainingNodesRequested(_canvas: Canvas, _bbox: BBox, nodes: CanvasNode[]) {
    // Remove nodes from portals from the list
    nodes.splice(0, nodes.length, ...nodes.filter(node => node.getData().portalId === undefined))
  }

  private onSelectionChanged(canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) {
    // Unselect nodes from portals
    updateSelection(() => {
      const updatedSelection = Array.from(canvas.selection)
        .filter(node => node.getData().portalId === undefined)
      canvas.selection = new Set(updatedSelection)
    })

    // Move previously selected portals to the back
    const previouslySelectedPortalNodesIds = Array.from(oldSelection)
      .filter(node => (node.getData() as any).portalToFile !== undefined)
      .flatMap(node => {
        const portalNodeData = node.getData()
        const nestedPortalsIds = this.getNestedPortalsIds(canvas, portalNodeData.id)

        return [portalNodeData.id, ...nestedPortalsIds]
      })

    for (const node of canvas.nodes.values()) {
      const nodeData = node.getData()

      // Not from unselected portal
      if (nodeData.portalId === undefined || !previouslySelectedPortalNodesIds.includes(nodeData.portalId)) continue

      // Move to front
      node.updateZIndex()
    }
  }

  private getNestedPortalsIds(canvas: Canvas, portalId: string): string[] {
    const nestedPortalsIds: string[] = []

    for (const node of canvas.nodes.values()) {
      const nodeData = node.getData()

      if (nodeData.portalId === portalId) {
        nestedPortalsIds.push(nodeData.id)
        nestedPortalsIds.push(...this.getNestedPortalsIds(canvas, nodeData.id))
      }
    }

    return nestedPortalsIds
  }

  restoreObjectSnappingState: () => void
  private onDraggingStateChanged(canvas: Canvas, startedDragging: boolean) {
    // If no open portal gets dragged, return
    if (!canvas.getSelectionData().nodes.some(node => node.type === 'file' && node.portalToFile)) return

    // Disable object snapping to fix self-aligning
    if (startedDragging) {
      const objectSnappingEnabled = canvas.options.snapToObjects
      this.restoreObjectSnappingState = () => canvas.toggleObjectSnapping(objectSnappingEnabled)

      if (objectSnappingEnabled) canvas.toggleObjectSnapping(false)
    } else this.restoreObjectSnappingState?.()
  }

  private onNodeMoved(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type !== 'file' || !nodeData.portalToFile) return

    this.onOpenPortalMoved(canvas, node)
  }

  private onOpenPortalMoved(canvas: Canvas, portalNode: CanvasNode) {
    let portalNodeData = portalNode.getData()

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

      return
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
      if (this.plugin.settings.getSetting('maintainClosedPortalSize')) {
        portalNodeData.width = portalNodeData.closedPortalWidth ?? portalNodeData.width
        portalNodeData.height = portalNodeData.closedPortalHeight ?? portalNodeData.height
      }

      // Remove references to portal nodes and edges
      delete portalNodeData.closedPortalWidth
      delete portalNodeData.closedPortalHeight
      delete portalNodeData.portalIdMaps
    }
  }

  private async getCanvasDataWithPortals(canvas: Canvas, dataRef: CanvasData): Promise<CanvasData> {
    // Deep copy data - If another file gets opened in the same view, the data would get overwritten
    const data = JSON.parse(JSON.stringify(dataRef)) as CanvasData

    // Open portals
    const addedData = await Promise.all(data.nodes.map(nodeData => this.tryOpenPortal(canvas, nodeData)))
    for (const newData of addedData) {
      data.nodes.push(...newData.nodes)
      data.edges.push(...newData.edges)
    }

    // Add cross-portal edges
    for (const originNodeData of data.nodes) {
      if (originNodeData.edgesToNodeFromPortal === undefined) continue

      for (const [relativePortalId, edges] of Object.entries(originNodeData.edgesToNodeFromPortal)) {
        const idPrefix = originNodeData.portalId ? `${originNodeData.portalId}-` : ''

        const portalId = `${idPrefix}${relativePortalId}`
        const targetPortalData = data.nodes.find(nodeData => nodeData.id === portalId)

        // If target portal is deleted, remove edges
        if (!targetPortalData) {
          delete originNodeData.edgesToNodeFromPortal![portalId]
          continue
        }

        // If portal is open, add edges
        if (targetPortalData.portalToFile) {
          // Push edges with updated from and to ids
          data.edges.push(...edges.map(edge => ({
            ...edge,
            portalId: originNodeData.portalId,
            fromNode: `${idPrefix}${edge.fromNode}`,
            toNode: `${idPrefix}${edge.toNode}`
          })))

          delete originNodeData.edgesToNodeFromPortal![portalId]
        } else if (this.plugin.settings.getSetting('showEdgesIntoDisabledPortals')) {
          // If portal is closed, add alternative edges directly to portal
          // But don't delete the edges

          data.edges.push(...edges.map(edge => {
            // Which end is from portal?
            const fromNodeId = `${idPrefix}${edge.fromNode}`
            const fromNode = data.nodes.find(nodeData => nodeData.id === fromNodeId)
            const toNodeId = `${idPrefix}${edge.toNode}`

            return {
              ...edge,
              fromNode: fromNode ? fromNodeId : portalId,
              toNode: fromNode ? portalId : toNodeId,
              portalId: portalId // Mark it as temporary
            }
          }))
        }
      }

      // If no more edges, delete the property
      if (Object.keys(originNodeData.edgesToNodeFromPortal!).length === 0)
        delete originNodeData.edgesToNodeFromPortal
    }

    return data
  }

  private async tryOpenPortal(canvas: Canvas, portalNodeData: CanvasNodeData): Promise<CanvasData> {
    const addedData: CanvasData = { nodes: [], edges: [] }
    if (portalNodeData.type !== 'file' || !portalNodeData.portalToFile) return addedData

    // Update portal file
    portalNodeData.portalToFile = portalNodeData.file

    // Fix recursive portals
    if (portalNodeData.portalToFile === canvas.view.file.path) {
      portalNodeData.portalToFile = undefined
      return addedData
    }

    const portalFile = this.plugin.app.vault.getAbstractFileByPath(portalNodeData.file!)
    if (!(portalFile instanceof TFile) || portalFile.extension !== 'canvas') {
      portalNodeData.portalToFile = undefined
      return addedData
    }

    const portalFileData = JSON.parse(await this.plugin.app.vault.cachedRead(portalFile))
    if (!portalFileData) {
      portalNodeData.portalToFile = undefined
      return addedData
    }

    // Add portal nodes and edges id map
    portalNodeData.portalIdMaps = {
      nodeIdMap: {},
      edgeIdMap: {}
    }

    // Calculate nested node offset
    const sourceMinCoordinates = CanvasHelper.getBBox(portalFileData.nodes)
    const portalOffset = {
      x: portalNodeData.x - sourceMinCoordinates.minX + PORTAL_PADDING,
      y: portalNodeData.y - sourceMinCoordinates.minY + PORTAL_PADDING
    }

    // Add nodes from portal
    for (const nodeDataFromPortal of portalFileData.nodes) {
      const refNodeId = `${portalNodeData.id}-${nodeDataFromPortal.id}`
      portalNodeData.portalIdMaps.nodeIdMap[refNodeId] = nodeDataFromPortal.id
      
      const addedNode = {
        ...nodeDataFromPortal,
        id: refNodeId,
        x: nodeDataFromPortal.x + portalOffset.x,
        y: nodeDataFromPortal.y + portalOffset.y,
        portalId: portalNodeData.id
      }

      addedData.nodes.push(addedNode)

      const nestedNodes = await this.tryOpenPortal(canvas, addedNode)
      addedData.nodes.push(...nestedNodes.nodes)
      addedData.edges.push(...nestedNodes.edges)
    }

    // Add edges from portal
    for (const edgeDataFromPortal of portalFileData.edges) {
      const refEdgeId = `${portalNodeData.id}-${edgeDataFromPortal.id}`
      portalNodeData.portalIdMaps.edgeIdMap[refEdgeId] = edgeDataFromPortal.id

      const fromRefNode = Object.entries(portalNodeData.portalIdMaps.nodeIdMap)
        .find(([_refNodeId, nodeId]) => nodeId === edgeDataFromPortal.fromNode)?.[0]
      const toRefNode = Object.entries(portalNodeData.portalIdMaps.nodeIdMap)
        .find(([_refNodeId, nodeId]) => nodeId === edgeDataFromPortal.toNode)?.[0]

      addedData.edges.push({
        ...edgeDataFromPortal,
        id: refEdgeId,
        fromNode: fromRefNode,
        toNode: toRefNode,
        portalId: portalNodeData.id
      })
    }

    // Resize portal
    const nestedNodesBBox = CanvasHelper.getBBox(addedData.nodes)
    const targetSize = this.getPortalSize(nestedNodesBBox)

    // Save closed portal size
    portalNodeData.closedPortalWidth = portalNodeData.width
    portalNodeData.closedPortalHeight = portalNodeData.height

    // Set open portal size
    portalNodeData.width = targetSize.width
    portalNodeData.height = targetSize.height

    return addedData
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