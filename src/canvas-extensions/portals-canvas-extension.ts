import { TFile } from "obsidian"
import { Canvas, CanvasData, CanvasEdgeData, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"

const PORTAL_PADDING = 20

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
      CanvasEvent.NodesChanged,
      (canvas: Canvas, nodes: CanvasNode[]) => this.onNodesChanged(canvas, nodes)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeRemoved,
      (canvas: Canvas, _node: CanvasNode) => canvas.setData(canvas.getData())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeMoved,
      (canvas: Canvas, node: CanvasNode) => this.onNodeMoved(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DataRequested,
      (canvas: Canvas, data: CanvasData) => this.removePortalCanvasData(canvas, data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.LoadData,
      (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => this.addPortalCanvasData(canvas, data, setData)
    ))
  }

  private updatePopupMenu(canvas: Canvas) {
    const selectedFileNodes = Array.from(canvas.selection).filter(node => node.getData().type === 'file')
    if (canvas.readonly || selectedFileNodes.length !== 1) return

    const fileNode = selectedFileNodes[0]
    const isPortalOpen = fileNode.getData().isPortalOpen

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption(
        'toggle-portal',
        isPortalOpen ? 'Close portal' : 'Open portal',
        isPortalOpen ? 'door-open' : 'door-closed',
        () => {
          canvas.setNodeData(fileNode, 'isPortalOpen', !isPortalOpen)
          this.updatePopupMenu(canvas)

          // Update canvas data
          canvas.setData(canvas.getData())
        }
      )
    )
  }

  private onNodesChanged(_canvas: Canvas, nodes: CanvasNode[]) {
    for (const node of nodes) {
      const nodeData = node.getData()
      if (nodeData.type !== 'file' || !nodeData.isPortalOpen) continue

      // Move portal to back
      node.zIndex = -1
    }
  }

  private onNodeMoved(canvas: Canvas, portalNode: CanvasNode) {
    const portalNodeData = portalNode.getData()
    if (portalNodeData.type !== 'file' || !portalNodeData.isPortalOpen) return

    // Update nested nodes positions
    const nestedNodesIdMap = portalNode.getData().portalIdMaps?.nodeIdMap
    if (!nestedNodesIdMap) return

    const nestedNodes = Object.keys(nestedNodesIdMap).map(refNodeId => canvas.nodes.get(refNodeId))
      .filter(node => node !== undefined) as CanvasNode[]
    const sourceBBox = CanvasHelper.getBBox(nestedNodes)

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

    // Resize portal
    const nestedNodesSize = {
      width: sourceBBox.maxX - sourceBBox.minX,
      height: sourceBBox.maxY - sourceBBox.minY
    }
    const targetSize = {
      width: nestedNodesSize.width + PORTAL_PADDING * 2,
      height: nestedNodesSize.height + PORTAL_PADDING * 2
    }

    if (portalNodeData.width !== targetSize.width || portalNodeData.height !== targetSize.height) {
      portalNode.setData({
        ...portalNodeData,
        width: targetSize.width,
        height: targetSize.height
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
        // TODO: Save to portal file
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
      if (portalNodeData.type !== 'file' || !portalNodeData.isPortalOpen)

      // Reset portal size
      portalNodeData.width = portalNodeData.closedPortalWidth ?? portalNodeData.width
      portalNodeData.height = portalNodeData.closedPortalHeight ?? portalNodeData.height

      // Remove portal offset
      delete portalNodeData.portalOffsetX
      delete portalNodeData.portalOffsetY

      // Remove references to portal nodes and edges
      delete portalNodeData.portalIdMaps
    }
  }

  private async addPortalCanvasData(_canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) {
    for (const portalNodeData of data.nodes) {
      if (portalNodeData.type !== 'file' || !portalNodeData.isPortalOpen) continue

      const portalFile = this.plugin.app.vault.getAbstractFileByPath(portalNodeData.file!)
      if (!(portalFile instanceof TFile)) continue

      const portalData = JSON.parse(await this.plugin.app.vault.cachedRead(portalFile))
      if (!portalData) continue

      // Resize portal
      const sourceBBox = CanvasHelper.getBBox(portalData.nodes)
      const sourceSize = {
        width: sourceBBox.maxX - sourceBBox.minX,
        height: sourceBBox.maxY - sourceBBox.minY
      }

      // Save closed portal size
      portalNodeData.closedPortalWidth = portalNodeData.width
      portalNodeData.closedPortalHeight = portalNodeData.height

      // Set open portal size
      portalNodeData.width = sourceSize.width + PORTAL_PADDING * 2
      portalNodeData.height = sourceSize.height + PORTAL_PADDING * 2

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
        
        data.nodes.push({
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

        data.edges.push({
          ...edgeDataFromPortal,
          id: refEdgeId,
          fromNode: fromRefNode,
          toNode: toRefNode,
          portalId: portalNodeData.id
        })
      }
    }

    // Create edges between portal nodes and non-portal nodes
    for (const nodeData of data.nodes) {
      if (nodeData.edgesToNodeFromPortal === undefined) continue

      for (const [portalId, edges] of Object.entries(nodeData.edgesToNodeFromPortal)) {
        // If portal is deleted, delete edges
        const portalNodeData = data.nodes.find(nodeData => nodeData.id === portalId)
        if (!portalNodeData) {
          delete nodeData.edgesToNodeFromPortal![portalId]
          continue
        }

        if (portalNodeData.isPortalOpen) { // If portal is open, add edges
          data.edges.push(...edges)
          delete nodeData.edgesToNodeFromPortal![portalId]
        }

        // If portal is closed, add alternative edges directly to portal
        // But don't delete the edges
        if (!portalNodeData.isPortalOpen && this.plugin.settingsManager.getSetting('showEdgesIntoDisabledPortals')) {
          data.edges.push(...edges.map(edge => (
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

    setData(data)
  }
}