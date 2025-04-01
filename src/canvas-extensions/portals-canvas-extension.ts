import { TFile } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasElement, CanvasNode, CanvasView } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasData, CanvasEdgeData, CanvasFileNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"

const PORTAL_PADDING = 50
const MIN_OPEN_PORTAL_SIZE = { width: 200, height: 200 }

export default class PortalsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'portalsFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.vault.on('modify', (file: TFile) => {
      for (const canvasLeaf of this.plugin.app.workspace.getLeavesOfType('canvas') as any[])
        if (canvasLeaf.view?.canvas) this.onFileModified(canvasLeaf.view.canvas, file)
    }))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.updatePopupMenu(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-removed',
      (canvas: Canvas, node: CanvasNode) => this.onNodeRemoved(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-moved',
      (canvas: Canvas, node: CanvasNode, _keyboard: boolean) => this.onNodeMoved(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas, node: CanvasNode) => this.onNodeResized(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:dragging-state-changed',
      (canvas: Canvas, startedDragging: boolean) => this.onDraggingStateChanged(canvas, startedDragging)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:containing-nodes-requested',
      (canvas: Canvas, bbox: BBox, nodes: CanvasNode[]) => this.onContainingNodesRequested(canvas, bbox, nodes)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed',
      (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas, oldSelection, updateSelection)
    ))
    
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-requested',
      (canvas: Canvas, data: CanvasData) => this.removePortalCanvasData(canvas, data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:load-data',
      (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => {
        this.getCanvasDataWithPortals(canvas, data)
          .then((newData: CanvasData) => {
            // Skip if the data didn't change
            if (newData.nodes.length === data.nodes.length && newData.edges.length === data.edges.length) return
            setData(newData)

            // Resize open portals
            for (const nodeData of [...newData.nodes, ...newData.nodes.slice().reverse()] as CanvasFileNodeData[]) {
              if (nodeData.type !== 'file' || !nodeData.portal) continue
              this.onOpenPortalResized(canvas, canvas.nodes.get(nodeData.id)!)
            }
          })
      }
    ))
  }

  private onFileModified(canvas: Canvas, file: TFile) {
    const isAffected = Object.values(canvas.nodes).filter((nodeData: CanvasNode) => 
      nodeData.getData().type === 'file' && 
      nodeData.currentPortalFile === file.path
    ).length > 0
    if (!isAffected) return

    // Update whole canvas data
    canvas.setData(canvas.getData())

    // Maintain history
    canvas.history.current--
    canvas.history.data.pop()
  }

  private updatePopupMenu(canvas: Canvas) {
    if (canvas.readonly) return

    // Only search for valid nodes
    const selectedFileNodes = canvas.getSelectionData().nodes.map((nodeData: CanvasFileNodeData) => {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) return null

      if (nodeData.type !== 'file') return null
      if (node.file?.extension === 'canvas') return node
      
      // Close portal of non-canvas file
      if (nodeData.portal) this.setPortalOpen(canvas, node, false)

      return null
    }).filter(node => node !== null) as CanvasNode[]
    
    if (selectedFileNodes.length !== 1) return

    const portalNode = selectedFileNodes.first()!
    const portalNodeData = portalNode.getData() as CanvasFileNodeData

    // If file changed reopen portal
    if (portalNodeData.portal && portalNodeData.file !== portalNode.currentPortalFile)
      this.setPortalOpen(canvas, portalNode, true)

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'toggle-portal',
        label: portalNodeData.portal ? 'Close portal' : 'Open portal',
        icon: portalNodeData.portal ? 'door-open' : 'door-closed',
        callback: () => {
          this.setPortalOpen(canvas, portalNode, !portalNodeData.portal)
          this.updatePopupMenu(canvas)
        }
      })
    )
  }

  private onContainingNodesRequested(_canvas: Canvas, _bbox: BBox, nodes: CanvasNode[]) {
    // Remove nodes from portals from the list
    const filteredNodes = nodes.filter(node => !this.isPortalElement(node))
    nodes.splice(0, nodes.length, ...filteredNodes)
  }
  
  private onSelectionChanged(canvas: Canvas, _oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) {
    // Unselect nodes from portals
    updateSelection(() => {
      const updatedSelection = Array.from(canvas.selection)
        .filter(canvasElement => !this.isPortalElement(canvasElement))
      canvas.selection = new Set(updatedSelection)
    })
  }

  private onDraggingStateChanged(canvas: Canvas, startedDragging: boolean) {
    if (!startedDragging) return

    // If no open portal gets dragged, return
    if (!canvas.getSelectionData().nodes.some((node: CanvasFileNodeData) => node.type === 'file' && node.portal)) return

    const objectSnappingEnabled = canvas.options.snapToObjects
    if (!objectSnappingEnabled) return

    // Disable object snapping to fix self-aligning
    canvas.toggleObjectSnapping(false)

    const dragEndEventRef = this.plugin.app.workspace.on(
      'advanced-canvas:dragging-state-changed',
      (canvas: Canvas, startedDragging: boolean) => {
        if (startedDragging) return

        // Re-enable object snapping
        canvas.toggleObjectSnapping(objectSnappingEnabled)

        // Remove drag end event listener
        this.plugin.app.workspace.offref(dragEndEventRef)
      }
    )
    this.plugin.registerEvent(dragEndEventRef)
  }

  private getContainingNodes(canvas: Canvas, portalNode: CanvasNode): CanvasNode[] {
    return Array.from(canvas.nodes.values())
      .filter(node => this.isChildOfPortal(portalNode.getData() as CanvasFileNodeData, node.getData()))
  }

  private getContainingEdges(canvas: Canvas, portalNode: CanvasNode): CanvasEdge[] {
    return Array.from(canvas.edges.values())
      .filter(edge => this.isChildOfPortal(portalNode.getData() as CanvasFileNodeData, edge.getData()))
  }

  private onNodeRemoved(canvas: Canvas, portalNode: CanvasNode) {
    const portalNodeData = portalNode.getData() as CanvasFileNodeData
    if (portalNodeData.type !== 'file' || !portalNodeData.portal) return

    for (const node of this.getContainingNodes(canvas, portalNode))
      canvas.removeNode(node)

    for (const edge of this.getContainingEdges(canvas, portalNode))
      canvas.removeEdge(edge)
  }

  //////

  private setPortalOpen(canvas: Canvas, portalNode: CanvasNode, open: boolean) {
    const portalNodeData = portalNode.getData() as CanvasFileNodeData
    portalNode.setData({
      ...portalNodeData,
      portal: open
    })

    portalNode.currentPortalFile = open ? portalNodeData.file : undefined

    // Update whole canvas data
    canvas.setData(canvas.getData())
  }


  private getNestedPortalsIds(canvas: Canvas, portalId: string): string[] {
    const nestedPortalsIds: string[] = []

    for (const node of canvas.nodes.values()) {
      const nodeData = node.getData()

      if (this.getNestedIds(nodeData.id).includes(portalId)) {
        nestedPortalsIds.push(nodeData.id)
        nestedPortalsIds.push(...this.getNestedPortalsIds(canvas, nodeData.id))
      }
    }

    return nestedPortalsIds
  }

  

  private onNodeMoved(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData() as CanvasFileNodeData
    if (nodeData.type !== 'file' || !nodeData.portal) return

    this.onOpenPortalMoved(canvas, node)
  }

  private onOpenPortalMoved(canvas: Canvas, portalNode: CanvasNode) {
    let portalNodeData = portalNode.getData() as CanvasFileNodeData

    const nestedNodes = this.getContainingNodes(canvas, portalNode)
    const containingNodesBBox = CanvasHelper.getBBox(nestedNodes)

    // Move nested nodes
    const portalOffset = {
      x: portalNodeData.x - containingNodesBBox.minX + PORTAL_PADDING,
      y: portalNodeData.y - containingNodesBBox.minY + PORTAL_PADDING
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

  private onNodeResized(canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData() as CanvasFileNodeData
    if (nodeData.type !== 'file' || !nodeData.portal) return

    this.onOpenPortalResized(canvas, node)
  }

  private onOpenPortalResized(canvas: Canvas, portalNode: CanvasNode) {
    let portalNodeData = portalNode.getData() as CanvasFileNodeData

    const nestedNodes = this.getContainingNodes(canvas, portalNode)
    const containingNodesBBox = CanvasHelper.getBBox(nestedNodes)
    const targetSize = this.getPortalSize(containingNodesBBox)

    // Resize portal
    if (portalNodeData.width !== targetSize.width || portalNodeData.height !== targetSize.height) {
      portalNode.setData({
        ...portalNodeData,
        width: targetSize.width,
        height: targetSize.height
      })

      return
    }
  }

  private removePortalCanvasData(_canvas: Canvas, data: CanvasData) {
    // Performance improvement: Create a map of nodes by id
    const nodesIdMap: Map<string, CanvasNodeData> = new Map(data.nodes.map(nodeData => [nodeData.id, nodeData]))

    data.edges = data.edges.filter(edgeData => {
      if (this.getNestedIds(edgeData.fromNode).length > 1) return false

      const fromNodeData = nodesIdMap.get(edgeData.fromNode)
      const toNodeData = nodesIdMap.get(edgeData.toNode)
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

    data.nodes = data.nodes.filter(nodeData => {
      // Remove nodes if they are from a portal
      if (this.getNestedIds(nodeData.id).length > 1) return false
      return true
    })
  }

  private async getCanvasDataWithPortals(canvas: Canvas, dataRef: CanvasData): Promise<CanvasData> {
    // Deep copy data - If another file gets opened in the same view, the data would get overwritten
    const data = JSON.parse(JSON.stringify(dataRef)) as CanvasData

    // Open portals
    this.nestedPortals = {}
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
        if (targetPortalData.portal) {
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

  private nestedPortals: { [portalId: string]: string[] } = {}
  private async tryOpenPortal(canvas: Canvas, portalNodeData: CanvasNodeData, parentPortalId?: string): Promise<CanvasData> {
    const addedData: CanvasData = { nodes: [], edges: [] }
    if (portalNodeData.type !== 'file' || !portalNodeData.portal) return addedData

    // Update portal file
    portalNodeData.portal = portalNodeData.file

    // Fix direct recursion
    if (portalNodeData.portal === canvas.view.file.path) {
      portalNodeData.portal = undefined
      return addedData
    }

    // Fix indirect recursion
    if (parentPortalId) {
      if (this.nestedPortals[parentPortalId]?.includes(portalNodeData.portal!)) {
        portalNodeData.portal = undefined
        return addedData
      }
      
      this.nestedPortals[parentPortalId] = this.nestedPortals[parentPortalId] ?? []
      this.nestedPortals[parentPortalId].push(portalNodeData.portal!)
    }

    const portalFile = this.plugin.app.vault.getAbstractFileByPath(portalNodeData.file!)
    if (!(portalFile instanceof TFile) || portalFile.extension !== 'canvas') {
      portalNodeData.portal = undefined
      return addedData
    }

    const portalFileDataString = await this.plugin.app.vault.cachedRead(portalFile)
    if (portalFileDataString === '') return addedData

    const portalFileData = JSON.parse(portalFileDataString) as CanvasData
    if (!portalFileData) {
      portalNodeData.portal = undefined
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

      const nestedNodes = await this.tryOpenPortal(canvas, addedNode, parentPortalId ?? portalNodeData.id)
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

      if (!fromRefNode || !toRefNode) continue

      addedData.edges.push({
        ...edgeDataFromPortal,
        id: refEdgeId,
        fromNode: fromRefNode,
        toNode: toRefNode,
        portalId: portalNodeData.id
      })
    }

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

  // Helper functions
  private isPortalElement(canvasElement: CanvasElement | CanvasNodeData | CanvasEdgeData): boolean {
    return this.getNestedIds(canvasElement.id).length > 1
  }

  private getNestedIds(id: string): string[] {
    return id.split("-")
  }

  private isChildOfPortal(portal: CanvasFileNodeData, canvasElement: CanvasElement | CanvasNodeData | CanvasEdgeData): boolean {
    return canvasElement.id !== portal.id && canvasElement.id.startsWith(portal.id)
  }
}