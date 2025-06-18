import { Notice, TFile } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasEdgeEnd, CanvasElement, CanvasElementsData, CanvasNode, CanvasView } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasData, CanvasEdgeData, CanvasFileNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"

const PORTAL_PADDING = 50
const MIN_OPEN_PORTAL_SIZE = { width: 200, height: 200 }

export default class PortalsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'portalsFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.vault.on('modify', (file: TFile) => {
      for (const canvas of this.plugin.getCanvases()) 
        this.onFileModified(canvas, file)
    }))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenu(canvas)
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
      'advanced-canvas:edge-connection-try-dragging:before',
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, cancelRef: { value: boolean }) => this.onEdgeConnectionTryDraggingBefore(canvas, edge, event, cancelRef)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-connection-dragging:after',
      (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to', previousEnds?: { from: CanvasEdgeEnd, to: CanvasEdgeEnd }) => this.onEdgeConnectionDraggingAfter(canvas, edge, event, newEdge, side, previousEnds)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed',
      (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas, oldSelection, updateSelection)
    ))
    
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-requested',
      (canvas: Canvas, data: CanvasData) => this.onGetData(canvas, data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-loaded:before',
      (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => {
        this.onSetData(canvas, data)
          .then((newData: CanvasData) => {
            // Skip if the data didn't change
            if (newData.nodes.length === data.nodes.length && newData.edges.length === data.edges.length) return
            setData(newData)
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

  private onContainingNodesRequested(_canvas: Canvas, _bbox: BBox, nodes: CanvasNode[]) {
    // Remove nodes from portals from the list
    const filteredNodes = nodes.filter(node => !PortalsCanvasExtension.isPortalElement(node))
    nodes.splice(0, nodes.length, ...filteredNodes)
  }
  
  private onSelectionChanged(canvas: Canvas, _oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) {
    // Unselect nodes from portals
    updateSelection(() => {
      const updatedSelection = Array.from(canvas.selection)
        .filter(canvasElement => !PortalsCanvasExtension.isPortalElement(canvasElement))
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

  private onNodeMoved(canvas: Canvas, portalNode: CanvasNode) {
    const portalNodeData = portalNode.getData() as CanvasFileNodeData
    if (portalNodeData.type !== 'file' || !portalNodeData.isPortalLoaded) return

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

  private onNodeResized(_canvas: Canvas, portalNode: CanvasNode) {
    const portalNodeData = portalNode.getData() as CanvasFileNodeData
    if (portalNodeData.type !== 'file' || !portalNodeData.isPortalLoaded) return

    // Resize portal
    portalNode.setData({
      ...portalNodeData,
      x: portalNode.prevX ? portalNode.prevX : portalNodeData.x,
      y: portalNode.prevY ? portalNode.prevY : portalNodeData.y,
      width: portalNode.prevWidth ? portalNode.prevWidth : portalNodeData.width,
      height: portalNode.prevHeight ? portalNode.prevHeight : portalNodeData.height
    })
  }

  private onNodeRemoved(canvas: Canvas, portalNode: CanvasNode) {
    const portalNodeData = portalNode.getData() as CanvasFileNodeData
    if (portalNodeData.type !== 'file' || !portalNodeData.portal) return

    for (const node of this.getContainingNodes(canvas, portalNode, false))
      canvas.removeNode(node)

    for (const edge of this.getContainingEdges(canvas, portalNode, false))
      canvas.removeEdge(edge)
  }

  private onEdgeConnectionTryDraggingBefore(_canvas: Canvas, edge: CanvasEdge, _event: PointerEvent, cancelRef: { value: boolean }) {
    // If not from a portal, return
    if (!PortalsCanvasExtension.isPortalElement(edge)) return

    cancelRef.value = true // Cancel dragging
    new Notice('Updating edges from portals is not supported yet.')
  }

  private onEdgeConnectionDraggingAfter(canvas: Canvas, edge: CanvasEdge, _event: PointerEvent, _newEdge: boolean, _side: 'from' | 'to', _previousEnds?: { from: CanvasEdgeEnd, to: CanvasEdgeEnd }) {
    if (PortalsCanvasExtension.isPortalElement(edge)) return // If edge is from a portal, return
    if (!PortalsCanvasExtension.isPortalElement(edge.from.node) || !PortalsCanvasExtension.isPortalElement(edge.to.node)) return // Do not cancel if at least one end is not from a portal

    canvas.removeEdge(edge)
    new Notice('Creating edges with both ends in portals are not supported yet.')
  }

  private onPopupMenu(canvas: Canvas) {
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
          this.onPopupMenu(canvas)
        }
      })
    )
  }

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

  // Remove all edges and nodes from portals
  private onGetData(_canvas: Canvas, data: CanvasData) {
    data.nodes = data.nodes.filter(nodeData => PortalsCanvasExtension.getNestedIds(nodeData.id).length === 1)

    // Remove intermediate isPortalLoaded property from nodes
    for (const nodeData of data.nodes) delete (nodeData as CanvasFileNodeData).isPortalLoaded

    const portalsIdMap = new Map(data.nodes
      .filter((nodeData: CanvasFileNodeData) => nodeData.portal)
      .map(nodeData => [nodeData.id, nodeData])
    ) as Map<string, CanvasFileNodeData>

    data.edges = data.edges.filter(edgeData => {
      if (PortalsCanvasExtension.getNestedIds(edgeData.fromNode).length > 1) return false // Came from portal

      const isFromNodeFromPortal = PortalsCanvasExtension.getNestedIds(edgeData.fromNode).length > 1
      const isToNodeFromPortal = PortalsCanvasExtension.getNestedIds(edgeData.toNode).length > 1

      if (!isFromNodeFromPortal && !isToNodeFromPortal) return true // Normal edge
      if (isFromNodeFromPortal && isToNodeFromPortal) return false // Both from portal NOT SUPPORTED YET

      // Interdimensional edge
      const targetPortalId = this.getParentPortalId(isFromNodeFromPortal ? edgeData.fromNode : edgeData.toNode)!
      const targetPortalData = portalsIdMap.get(targetPortalId)
      if (!targetPortalData) return false // Portal not found

      targetPortalData.interdimensionalEdges ??= [] // Create array if not exists
      targetPortalData.interdimensionalEdges.push(edgeData) // Save edge to portal node

      return false // Remove edge here (but it's still saved in the portal node tho)
    })
  }

  // Add all edges and nodes from portals
  private async onSetData(canvas: Canvas, dataRef: CanvasData): Promise<CanvasData> {
    // Deep copy data - If another file gets opened in the same view, the data would get overwritten
    const data = JSON.parse(JSON.stringify(dataRef)) as CanvasData

    // Open portals
    const addedData = await Promise.all(data.nodes.map(nodeData => this.tryOpenPortal(canvas, nodeData as CanvasFileNodeData)))
    for (const newData of addedData) {
      data.nodes.push(...newData.nodes)
      data.edges.push(...newData.edges)
    }

    // Add interdimensional edges // TODO: Only loop through open portals (can be done because of tryOpenPortal)
    for (const nodeData of data.nodes) {
      if (nodeData.type !== 'file' || !(nodeData as CanvasFileNodeData).isPortalLoaded) continue // Only loaded portals

      const interdimensionalEdges = (nodeData as CanvasFileNodeData).interdimensionalEdges
      if (!interdimensionalEdges) continue // No interdimensional edges

      for (const edge of interdimensionalEdges) data.edges.push(edge)

      // Remove interdimensional edges from portal node (to avoid duplication on re-save)
      delete (nodeData as CanvasFileNodeData).interdimensionalEdges
    }

    return data
  }

  private async tryOpenPortal(canvas: Canvas, portalNodeData: CanvasFileNodeData, nestedPortalFiles: Set<string> = new Set()): Promise<CanvasElementsData> {
    const addedData: CanvasElementsData = { nodes: [], edges: [] }
    if (portalNodeData.type !== 'file' || !portalNodeData.portal) return addedData

    // Fix direct recursion
    if (portalNodeData.file === canvas.view.file.path) return addedData

    // Fix indirect recursion
    if (nestedPortalFiles.has(portalNodeData.file)) return addedData
    nestedPortalFiles.add(portalNodeData.file)

    // Check if portal file exists
    const portalFile = this.plugin.app.vault.getAbstractFileByPath(portalNodeData.file)
    if (!(portalFile instanceof TFile) || portalFile.extension !== 'canvas') return addedData

    // Read portal file data
    const portalFileDataString = await this.plugin.app.vault.cachedRead(portalFile)
    if (portalFileDataString === '') return addedData

    const portalFileData = JSON.parse(portalFileDataString) as CanvasData
    if (!portalFileData) return addedData

    // Set portal to loaded
    portalNodeData.isPortalLoaded = true

    // Calculate nested node offset
    const sourceMinCoordinates = CanvasHelper.getBBox(portalFileData.nodes)
    const portalOffset = {
      x: portalNodeData.x - sourceMinCoordinates.minX + PORTAL_PADDING,
      y: portalNodeData.y - sourceMinCoordinates.minY + PORTAL_PADDING
    }

    // Add nodes from portal
    for (const nodeDataFromPortal of portalFileData.nodes) {
      const newNodeId = `${portalNodeData.id}-${nodeDataFromPortal.id}`
      const addedNode = {
        ...nodeDataFromPortal,
        id: newNodeId,
        x: nodeDataFromPortal.x + portalOffset.x,
        y: nodeDataFromPortal.y + portalOffset.y
      }
      addedData.nodes.push(addedNode)

      // Try to open nested portals
      const nestedNodes = await this.tryOpenPortal(canvas, addedNode as CanvasFileNodeData, nestedPortalFiles)
      addedData.nodes.push(...nestedNodes.nodes)
      addedData.edges.push(...nestedNodes.edges)
    }

    // Add edges from portal
    for (const edgeDataFromPortal of portalFileData.edges) {
      const newEdgeId = `${portalNodeData.id}-${edgeDataFromPortal.id}`

      const fromNodeId = `${portalNodeData.id}-${edgeDataFromPortal.fromNode}`
      const toNodeId = `${portalNodeData.id}-${edgeDataFromPortal.toNode}`

      addedData.edges.push({
        ...edgeDataFromPortal,
        id: newEdgeId,
        fromNode: fromNodeId,
        toNode: toNodeId
      })
    }

    // Resize portal node
    const targetSize = this.getPortalSize(CanvasHelper.getBBox(addedData.nodes))
    portalNodeData.width = targetSize.width
    portalNodeData.height = targetSize.height

    return addedData
  }

  // Helper functions
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

  private getContainingNodes(canvas: Canvas, portalNode: CanvasNode, directChildren = true): CanvasNode[] {
    return Array.from(canvas.nodes.values())
      .filter(node => this.isChildOfPortal(portalNode.getData() as CanvasFileNodeData, node.getData(), directChildren))
  }

  private getContainingEdges(canvas: Canvas, portalNode: CanvasNode, directChildren = true): CanvasEdge[] {
    return Array.from(canvas.edges.values())
      .filter(edge => this.isChildOfPortal(portalNode.getData() as CanvasFileNodeData, edge.getData(), directChildren))
  }

  private getParentPortalId(elementId: string): string | undefined {
    const nestedIds = PortalsCanvasExtension.getNestedIds(elementId)
    if (nestedIds.length < 2) return undefined
    return nestedIds.slice(0, -1).join("-")
  }

  static getNestedIds(id: string): string[] {
    return id.split("-")
  }

  static isPortalElement(canvasElement: CanvasElement | CanvasNodeData | CanvasEdgeData): boolean {
    return this.getNestedIds(canvasElement.id).length > 1
  }

  private isChildOfPortal(portal: CanvasFileNodeData, canvasElement: CanvasElement | CanvasNodeData | CanvasEdgeData, directChild = true): boolean {
    return canvasElement.id !== portal.id && // Not the portal itself
      canvasElement.id.startsWith(portal.id) && // Is a child of the portal
      (!directChild || PortalsCanvasExtension.getNestedIds(canvasElement.id).length === PortalsCanvasExtension.getNestedIds(portal.id).length + 1) // It's a direct child
  }
}