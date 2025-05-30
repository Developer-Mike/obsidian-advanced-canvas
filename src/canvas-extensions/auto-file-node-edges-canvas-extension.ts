import { TFile } from "obsidian"
import CanvasExtension from "./canvas-extension"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import { CanvasEdgeData, CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"

const AUTO_EDGE_ID_PREFIX = "afe"

export default class AutoFileNodeEdgesCanvasExtension extends CanvasExtension {
  isEnabled() { return 'autoFileNodeEdgesFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.metadataCache.on('changed', (file: TFile) => {
      for (const canvas of this.plugin.getCanvases()) 
        this.onMetadataChanged(canvas, file)
    }))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-added',
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
    ))
  }

  private onMetadataChanged(canvas: Canvas, file: TFile) {
    for (const node of canvas.nodes.values()) {
      if (node.getData().type !== 'file' || node.file?.path !== file.path) continue

      this.updateFileNodeEdges(canvas, node)
    }
  }

  private onNodeChanged(canvas: Canvas, node: CanvasNode) {
    if (node.getData().type !== 'file') return

    // Update all nodes (a node could've been added)
    for (const node of canvas.nodes.values()) {
      if (node.getData().type !== 'file') continue
      
      this.updateFileNodeEdges(canvas, node)
    }
  }

  private updateFileNodeEdges(canvas: Canvas, node: CanvasNode) {
    const edges = this.getFileNodeEdges(canvas, node)

    // Filter out existing edges
    const newEdges = Array.from(edges.values())
      .filter(edge => !canvas.edges.has(edge.id))
    
    // Add new edges
    canvas.importData({ nodes: [], edges: newEdges }, false, false)

    // Remove old edges
    for (const edge of canvas.edges.values()) {
      if (edge.id.startsWith(`${AUTO_EDGE_ID_PREFIX}${node.id}`) && !edges.has(edge.id)) 
        canvas.removeEdge(edge)
    }
  }

  private getFileNodeEdges(canvas: Canvas, node: CanvasNode): Map<string, CanvasEdgeData> {
    const canvasFile = canvas.view.file
    if (!canvasFile || !node.file) return new Map()

    const fileMetadata = this.plugin.app.metadataCache.getFileCache(node.file)
    if (!fileMetadata) return new Map()

    const linkedFilesFrontmatterKey = this.plugin.settings.getSetting('autoFileNodeEdgesFrontmatterKey')
    const fileLinksToBeLinkedTo = fileMetadata.frontmatterLinks?.filter(link => link.key.split(".")[0] === linkedFilesFrontmatterKey) ?? []

    const filepathsToBeLinkedTo = fileLinksToBeLinkedTo
      .map(link => this.plugin.app.metadataCache.getFirstLinkpathDest(link.link, canvasFile.path))
      .map(file => file?.path)
      .filter(path => path !== null)

    const nodesToBeLinkedTo = Array.from(canvas.nodes.values())
      .filter(otherNode => otherNode.id !== node.id && filepathsToBeLinkedTo.includes(otherNode.file?.path))

    const newEdges: Map<string, CanvasEdgeData> = new Map()
    for (const otherNode of nodesToBeLinkedTo) {
      const edgeId = `${AUTO_EDGE_ID_PREFIX}${node.id}${otherNode.id}`
      
      const bestFromSide = CanvasHelper.getBestSideForFloatingEdge(BBoxHelper.getCenterOfBBoxSide(otherNode.getBBox(), "right"), node)
      const bestToSide = CanvasHelper.getBestSideForFloatingEdge(BBoxHelper.getCenterOfBBoxSide(node.getBBox(), "left"), otherNode)

      newEdges.set(edgeId, {
        id: edgeId,
        fromNode: node.id,
        fromSide: bestFromSide,
        fromFloating: true,
        toNode: otherNode.id,
        toSide: bestToSide,
        toFloating: true,
      })
    }

    return newEdges
  }
}