/* Added by an LLM agent */
import { getAllTags, Notice, TFile } from "obsidian"
import { AnyCanvasNodeData, CanvasEdgeData, CanvasGroupNodeData, CanvasNodeData, CanvasTextNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasEdge, CanvasNode } from "src/@types/Canvas"
import { ExtendedCachedMetadata } from "src/@types/Obsidian"
import CanvasHelper from "src/utils/canvas-helper"
import { AbstractSelectionModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

/** Applied to hidden nodes/edges - the actual hiding happens in `styles/canvas-filter.scss` */
const FILTERED_OUT_CLASS = 'advanced-canvas-filtered-out'

const TAG_REGEX = /#[^\s#]+/g

interface ConnectionFilter {
  id: string
  name: string
  /** Follow edges that point away from the already included nodes */
  outgoing: boolean
  /** Follow edges that point towards the already included nodes */
  incoming: boolean
}

const CONNECTION_FILTERS: ConnectionFilter[] = [
  { id: 'filter-connected-nodes', name: 'Filter to selection and connected nodes', outgoing: true, incoming: true },
  { id: 'filter-outgoing-nodes', name: 'Filter to selection and outgoing nodes', outgoing: true, incoming: false },
  { id: 'filter-incoming-nodes', name: 'Filter to selection and incoming nodes', outgoing: false, incoming: true }
]

/**
 * Temporarily hides nodes and edges that don't match a filter (color, tag or connection to the
 * selection). The filter is purely visual - nothing gets written to the canvas file - and is reset
 * by the "Reset filter" command or by reopening the canvas.
 */
export default class CanvasFilterCanvasExtension extends CanvasExtension {
  isEnabled() { return 'canvasFilterFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'reset-filter',
      name: 'Reset filter',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => {
          this.showOnlyNodes(canvas)
          this.showOnlyEdges(canvas)
        }
      )
    })

    this.plugin.addCommand({
      id: 'filter-by-color',
      name: 'Filter by color of selection',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.filterByColor(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'filter-by-tag',
      name: 'Filter by tag',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => void this.filterByTag(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'hide-selection',
      name: 'Hide selection',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.hideSelection(canvas, false)
      )
    })

    this.plugin.addCommand({
      id: 'hide-selection-with-edges',
      name: 'Hide selection and its edges',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.hideSelection(canvas, true)
      )
    })

    for (const connectionFilter of CONNECTION_FILTERS) {
      this.plugin.addCommand({
        id: connectionFilter.id,
        name: connectionFilter.name,
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (canvas: Canvas) => canvas.selection.size > 0,
          (canvas: Canvas) => this.filterByConnections(canvas, connectionFilter)
        )
      })
    }
  }

  // Visibility helpers

  private setElementsVisibility(elements: (HTMLElement | undefined)[], visible: boolean) {
    for (const element of elements) element?.classList.toggle(FILTERED_OUT_CLASS, !visible)
  }

  private setNodeVisibility(node: CanvasNode, visible: boolean) {
    this.setElementsVisibility([node.nodeEl], visible)
  }

  private setEdgeVisibility(edge: CanvasEdge, visible: boolean) {
    this.setElementsVisibility([edge.lineGroupEl, edge.lineEndGroupEl, edge.labelElement?.wrapperEl], visible)
  }

  /** Shows the nodes with the given ids and hides all others. Shows every node if no ids are given. */
  private showOnlyNodes(canvas: Canvas, nodeIdsToShow?: Set<string>) {
    for (const node of canvas.nodes.values())
      this.setNodeVisibility(node, nodeIdsToShow === undefined || nodeIdsToShow.has(node.id))
  }

  /** Shows the edges with the given ids and hides all others. Shows every edge if no ids are given. */
  private showOnlyEdges(canvas: Canvas, edgeIdsToShow?: Set<string>) {
    for (const edge of canvas.edges.values())
      this.setEdgeVisibility(edge, edgeIdsToShow === undefined || edgeIdsToShow.has(edge.id))
  }

  /** Shows the given nodes, the groups containing them and the edges between them - hides everything else */
  private showOnlyNodesAndTheirEdges(canvas: Canvas, nodesToShow: AnyCanvasNodeData[]) {
    const canvasData = canvas.getData()

    const nodeIdsToShow = new Set(nodesToShow.map(node => node.id))
    const edgeIdsToShow = new Set(canvasData.edges
      .filter(edge => nodeIdsToShow.has(edge.fromNode) && nodeIdsToShow.has(edge.toNode))
      .map(edge => edge.id))

    for (const group of this.getGroupsContaining(canvasData.nodes, nodesToShow))
      nodeIdsToShow.add(group.id)

    this.showOnlyNodes(canvas, nodeIdsToShow)
    this.showOnlyEdges(canvas, edgeIdsToShow)
  }

  private static bboxContains(outerNode: CanvasNodeData, innerNode: CanvasNodeData) {
    return outerNode.x <= innerNode.x &&
      (outerNode.x + outerNode.width) >= (innerNode.x + innerNode.width) &&
      outerNode.y <= innerNode.y &&
      (outerNode.y + outerNode.height) >= (innerNode.y + innerNode.height)
  }

  /** Returns all group nodes that fully contain at least one of the given nodes */
  private getGroupsContaining(allNodes: AnyCanvasNodeData[], containedNodes: AnyCanvasNodeData[]): CanvasGroupNodeData[] {
    return allNodes.filter(node => node.type === 'group' &&
      containedNodes.some(containedNode => CanvasFilterCanvasExtension.bboxContains(node, containedNode))
    ) as CanvasGroupNodeData[]
  }

  // Filters

  private filterByColor(canvas: Canvas) {
    const colorsToShow = new Set([...canvas.selection].map(element => element.getData().color ?? ''))
    if (colorsToShow.has(''))
      new Notice('One of the selected elements has no color, so colorless nodes stay visible as well')

    const nodesToShow = canvas.getData().nodes
      .filter(node => node.type !== 'group' && colorsToShow.has(node.color ?? ''))

    this.showOnlyNodesAndTheirEdges(canvas, nodesToShow)
  }

  private async filterByTag(canvas: Canvas) {
    const tags = this.getAvailableTags(canvas)
    if (tags.length === 0) {
      new Notice('No tags found in this vault')
      return
    }

    const selectedTag = await new AbstractSelectionModal(this.plugin.app, 'Select a tag to filter by...', tags).awaitInput()
    if (!selectedTag) return

    const nodesToShow = canvas.getData().nodes
      .filter(node => this.getTagsOfNode(canvas, node).some(tag => CanvasFilterCanvasExtension.tagMatches(tag, selectedTag)))

    this.showOnlyNodesAndTheirEdges(canvas, nodesToShow)
  }

  private filterByConnections(canvas: Canvas, connectionFilter: ConnectionFilter) {
    const canvasData = canvas.getData()

    const nodeIdsToShow = new Set([...canvas.selection].map(element => element.id))
    const edgeIdsToShow = new Set<string>()

    // Traverse the graph breadth-first, starting at the selection
    let frontier = new Set(nodeIdsToShow)
    while (frontier.size > 0) {
      const nextFrontier = new Set<string>()

      for (const edge of canvasData.edges) {
        let reachedNodeId: string | null = null

        if (connectionFilter.outgoing && frontier.has(edge.fromNode)) reachedNodeId = edge.toNode
        else if (connectionFilter.incoming && frontier.has(edge.toNode)) reachedNodeId = edge.fromNode
        else continue

        edgeIdsToShow.add(edge.id)

        if (nodeIdsToShow.has(reachedNodeId)) continue
        nodeIdsToShow.add(reachedNodeId)
        nextFrontier.add(reachedNodeId)
      }

      frontier = nextFrontier
    }

    for (const group of this.getGroupsContaining(canvasData.nodes, canvasData.nodes.filter(node => nodeIdsToShow.has(node.id))))
      nodeIdsToShow.add(group.id)

    this.showOnlyNodes(canvas, nodeIdsToShow)
    this.showOnlyEdges(canvas, edgeIdsToShow)
  }

  private hideSelection(canvas: Canvas, includeConnectedEdges: boolean) {
    const selectedIds = new Set([...canvas.selection].map(element => element.id))

    for (const nodeId of selectedIds) {
      const node = canvas.nodes.get(nodeId)
      if (node) this.setNodeVisibility(node, false)

      const edge = canvas.edges.get(nodeId)
      if (edge) this.setEdgeVisibility(edge, false)
    }

    if (includeConnectedEdges) {
      for (const edge of canvas.edges.values()) {
        const edgeData: CanvasEdgeData = edge.getData()
        if (!selectedIds.has(edgeData.fromNode) && !selectedIds.has(edgeData.toNode)) continue

        this.setEdgeVisibility(edge, false)
      }
    }

    canvas.deselectAll()
  }

  // Tag helpers

  /** All tags of the vault, plus the ones that only exist inside text nodes of this canvas */
  private getAvailableTags(canvas: Canvas): string[] {
    const vaultTags = Object.keys(this.plugin.app.metadataCache.getTags() ?? {})
    const canvasTags = canvas.getData().nodes.flatMap(node => this.getTagsOfNode(canvas, node))

    return [...new Set([...vaultTags, ...canvasTags])].sort((a, b) => a.localeCompare(b))
  }

  private getTagsOfNode(canvas: Canvas, nodeData: AnyCanvasNodeData): string[] {
    if (nodeData.type === 'file') {
      const file = canvas.nodes.get(nodeData.id)?.file
      if (!(file instanceof TFile)) return []

      const fileMetadata = this.plugin.app.metadataCache.getFileCache(file)
      if (!fileMetadata) return []

      return getAllTags(fileMetadata) ?? []
    }

    if (nodeData.type === 'text') {
      // Prefer the per-node metadata created by the metadata cache patcher - it also knows about frontmatter tags
      const canvasFile = canvas.view.file
      const canvasMetadata = canvasFile ? this.plugin.app.metadataCache.getFileCache(canvasFile) as ExtendedCachedMetadata | null : null
      const nodeMetadata = canvasMetadata?.nodes?.[nodeData.id]
      if (nodeMetadata) return getAllTags(nodeMetadata) ?? []

      return [...(nodeData as CanvasTextNodeData).text.matchAll(TAG_REGEX)].map(match => match[0])
    }

    return []
  }

  /** Matches nested tags as well - e.g. the filter `#project` includes `#project/canvas` */
  private static tagMatches(tag: string, filterTag: string) {
    return tag === filterTag || tag.startsWith(`${filterTag}/`)
  }
}
