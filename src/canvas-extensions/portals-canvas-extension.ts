import { Canvas, CanvasData, CanvasNode } from "src/@types/Canvas"
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

  private removePortalCanvasData(_canvas: Canvas, data: CanvasData) {
    for (const portalNodeData of data.nodes) {
      if (!portalNodeData.portalIdMaps) continue

      // Reset portal size
      portalNodeData.width = portalNodeData.closedPortalWidth ?? portalNodeData.width
      portalNodeData.height = portalNodeData.closedPortalHeight ?? portalNodeData.height

      // Remove portal nodes and edges
      const portalNodeIds = Array.from(Object.keys(portalNodeData.portalIdMaps.nodeIdMap))
      data.nodes = data.nodes.filter(node => !portalNodeIds.includes(node.id))

      const portalEdgeIds = Array.from(Object.keys(portalNodeData.portalIdMaps.edgeIdMap))
      data.edges = data.edges.filter(edge => !portalEdgeIds.includes(edge.id))

      portalNodeData.portalIdMaps = undefined
    }
  }

  // CAUSING NEWLINES IN THE CANVAS DATA
  private async addPortalCanvasData(canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) {
    for (const portalNodeData of data.nodes) {
      if (portalNodeData.type !== 'file' || !portalNodeData.isPortalOpen) continue

      const portalData = JSON.parse(await this.plugin.app.vault.adapter.read(portalNodeData.file))
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
          y: nodeDataFromPortal.y + portalOffset.y
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
          toNode: toRefNode
        })
      }
    }

    setData(data)
  }
}