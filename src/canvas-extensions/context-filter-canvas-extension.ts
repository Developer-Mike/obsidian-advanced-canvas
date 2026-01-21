import { Canvas, CanvasEdge, CanvasNode, CanvasView } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const CONTROL_MENU_CONTEXT_FILTER_TOGGLE_ID = "context-filter-toggle"
const FILTER_ACTIVE_DATASET_KEY = "contextFilterActive"
const FILTER_ENABLED_DATASET_KEY = "contextFilterEnabled"
const NODE_FOCUS_CLASS = "ac-context-focus"
const NODE_NEIGHBOR_CLASS = "ac-context-neighbor"
const NODE_HIDDEN_CLASS = "ac-context-hidden"
const EDGE_HIDDEN_CLASS = "ac-context-hidden"

export default class ContextFilterCanvasExtension extends CanvasExtension {
  isEnabled() { return "contextFilterEnabled" as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "advanced-canvas:selection-changed",
      (canvas: Canvas) => this.onSelectionChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "advanced-canvas:canvas-changed",
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "advanced-canvas:canvas-view-unloaded:before",
      (view: CanvasView) => this.clearFilter(view.canvas)
    ))
  }

  private onSelectionChanged(canvas: Canvas) {
    this.refreshFilter(canvas)
  }

  private onCanvasChanged(canvas: Canvas) {
    this.addControlMenuToggle(canvas)
    this.refreshFilter(canvas)
  }

  private refreshFilter(canvas: Canvas) {
    if (!this.isContextFilterEnabled(canvas)) {
      this.clearFilter(canvas)
      return
    }

    const selectionData = canvas.getSelectionData()
    if (selectionData.nodes.length !== 1 || selectionData.edges.length > 0) {
      this.clearFilter(canvas)
      return
    }

    const focusNode = canvas.nodes.get(selectionData.nodes[0].id)
    if (!focusNode) {
      this.clearFilter(canvas)
      return
    }

    this.applyFilter(canvas, focusNode)
  }

  private addControlMenuToggle(canvas: Canvas) {
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    const controlMenuToggle = CanvasHelper.createControlMenuButton({
      id: CONTROL_MENU_CONTEXT_FILTER_TOGGLE_ID,
      label: "Context Filter",
      icon: "link",
      callback: () => this.toggleContextFilter(canvas)
    })

    CanvasHelper.addControlMenuButton(settingsContainer, controlMenuToggle)
  }

  private toggleContextFilter(canvas: Canvas) {
    const controlMenuToggle = canvas.quickSettingsButton?.parentElement
      ?.querySelector(`#${CONTROL_MENU_CONTEXT_FILTER_TOGGLE_ID}`) as HTMLElement | null
    if (!controlMenuToggle) return

    const newValue = controlMenuToggle.dataset.toggled !== "true"
    this.setContextFilterEnabled(canvas, newValue)
    controlMenuToggle.dataset.toggled = newValue.toString()
    this.refreshFilter(canvas)
  }

  private applyFilter(canvas: Canvas, focusNode: CanvasNode) {
    const connectedEdges = this.getConnectedEdges(canvas, focusNode)
    const visibleNodes = this.getConnectedNodes(focusNode, connectedEdges)

    for (const node of canvas.nodes.values()) {
      const isFocus = node === focusNode
      const isNeighbor = visibleNodes.has(node)

      node.nodeEl.classList.toggle(NODE_FOCUS_CLASS, isFocus)
      node.nodeEl.classList.toggle(NODE_NEIGHBOR_CLASS, !isFocus && isNeighbor)
      node.nodeEl.classList.toggle(NODE_HIDDEN_CLASS, !isNeighbor)
    }

    for (const edge of canvas.edges.values()) {
      const isVisible = connectedEdges.has(edge)
      this.setEdgeHidden(edge, !isVisible)
    }

    canvas.wrapperEl.dataset[FILTER_ACTIVE_DATASET_KEY] = "true"
  }

  private clearFilter(canvas: Canvas) {
    delete canvas.wrapperEl.dataset[FILTER_ACTIVE_DATASET_KEY]

    for (const node of canvas.nodes.values()) {
      node.nodeEl.classList.remove(NODE_FOCUS_CLASS, NODE_NEIGHBOR_CLASS, NODE_HIDDEN_CLASS)
    }

    for (const edge of canvas.edges.values()) {
      this.setEdgeHidden(edge, false)
    }
  }

  private isContextFilterEnabled(canvas: Canvas): boolean {
    return canvas.wrapperEl.dataset[FILTER_ENABLED_DATASET_KEY] === "true"
  }

  private setContextFilterEnabled(canvas: Canvas, enabled: boolean) {
    if (enabled) canvas.wrapperEl.dataset[FILTER_ENABLED_DATASET_KEY] = "true"
    else delete canvas.wrapperEl.dataset[FILTER_ENABLED_DATASET_KEY]
  }

  private getConnectedEdges(canvas: Canvas, focusNode: CanvasNode): Set<CanvasEdge> {
    const edges = new Set<CanvasEdge>()
    const outgoing = canvas.edgeFrom.get(focusNode)
    const incoming = canvas.edgeTo.get(focusNode)

    if (outgoing) for (const edge of outgoing) edges.add(edge)
    if (incoming) for (const edge of incoming) edges.add(edge)

    return edges
  }

  private getConnectedNodes(focusNode: CanvasNode, edges: Set<CanvasEdge>): Set<CanvasNode> {
    const nodes = new Set<CanvasNode>()
    nodes.add(focusNode)

    for (const edge of edges) {
      nodes.add(edge.from.node)
      nodes.add(edge.to.node)
    }

    return nodes
  }

  private setEdgeHidden(edge: CanvasEdge, hidden: boolean) {
    edge.lineGroupEl.classList.toggle(EDGE_HIDDEN_CLASS, hidden)
    edge.lineEndGroupEl.classList.toggle(EDGE_HIDDEN_CLASS, hidden)
    edge.labelElement?.wrapperEl?.classList.toggle(EDGE_HIDDEN_CLASS, hidden)
  }
}
