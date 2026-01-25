import { Canvas, CanvasNode, CanvasEdge, CanvasView } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const CONTROL_MENU_FOCUS_TOGGLE_ID = 'focus-mode-toggle'

const FOCUS_MODE_ENABLED = "focusModeEnabled"
const FOCUS_HIDE_NODES_ENABLED = "focusHideNodesEnabled"

const NODE_NEIGHBOR_CLASS = "ac-focus-neighbor"
const HIDDEN_CLASS = "ac-focus-hidden"

export default class FocusModeCanvasExtension extends CanvasExtension {
  isEnabled() { return 'focusModeFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'toggle-focus-mode',
      name: 'Toggle Focus Mode',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => this.toggleFocusMode(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'toggle-hide-nodes-in-focus-mode',
      name: 'Hide Nodes in Focus Mode',
      callback: async () => {
        const settingKey = "hideNodes" as const
        const currentValue = this.plugin.settings.getSetting(settingKey)
        const newValue = !currentValue

        await this.plugin.settings.setSetting({ [settingKey]: newValue })
      },
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => this.onSettingsChanged(this.plugin.getCurrentCanvas())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.addControlMenuToggle(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "advanced-canvas:selection-changed",
      (canvas: Canvas) => this.onSelectionChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "advanced-canvas:canvas-view-unloaded:before",
      (view: CanvasView) => this.clearFilter(view.canvas)
    ))
  }

  private onSettingsChanged(canvas: Canvas | null) {
    if (!canvas) return

    const isFocused = this.isFocusModeEnabled(canvas)
    if (!isFocused) {
      return
    }

    const hideNodes = this.plugin.settings.getSetting("hideNodes")
    this.setContextFilterEnabled(canvas, isFocused && hideNodes)
  }

  private addControlMenuToggle(canvas: Canvas) {
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    const controlMenuFocusToggle = CanvasHelper.createControlMenuButton({
      id: CONTROL_MENU_FOCUS_TOGGLE_ID,
      label: 'Focus Mode',
      icon: 'focus',
      callback: () => this.toggleFocusMode(canvas)
    })

    CanvasHelper.addControlMenuButton(settingsContainer, controlMenuFocusToggle)

    this.refreshFilter(canvas)
  }

  private onSelectionChanged(canvas: Canvas) {
    this.refreshFilter(canvas)
  }

  private toggleFocusMode(canvas: Canvas) {
    const controlMenuFocusToggle = canvas.quickSettingsButton?.parentElement?.querySelector(`#${CONTROL_MENU_FOCUS_TOGGLE_ID}`) as HTMLElement
    if (!controlMenuFocusToggle) return

    const newValue = controlMenuFocusToggle.dataset.toggled !== 'true'

    controlMenuFocusToggle.dataset.toggled = newValue.toString()

    this.setFocusModeEnabled(canvas, newValue)

    const hideNodes = this.plugin.settings.getSetting("hideNodes")
    this.setContextFilterEnabled(canvas, newValue && hideNodes)
    this.refreshFilter(canvas)
  }

  private refreshFilter(canvas: Canvas) {
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

  private isFocusModeEnabled(canvas: Canvas): boolean {
    return canvas.wrapperEl.dataset[FOCUS_MODE_ENABLED] === "true"
  }

  private setContextFilterEnabled(canvas: Canvas, enabled: boolean) {
    if (enabled) canvas.wrapperEl.dataset[FOCUS_HIDE_NODES_ENABLED] = "true"
    else delete canvas.wrapperEl.dataset[FOCUS_HIDE_NODES_ENABLED]
  }

  private setFocusModeEnabled(canvas: Canvas, enabled: boolean) {
    if (enabled) canvas.wrapperEl.dataset[FOCUS_MODE_ENABLED] = "true"
    else delete canvas.wrapperEl.dataset[FOCUS_MODE_ENABLED]
  }

  private applyFilter(canvas: Canvas, focusNode: CanvasNode) {
    const connectedEdges = this.getConnectedEdges(canvas, focusNode)
    const visibleNodes = this.getConnectedNodes(focusNode, connectedEdges)

    for (const node of canvas.nodes.values()) {
      const isFocus = node === focusNode
      const isNeighbor = visibleNodes.has(node)

      node.nodeEl.classList.toggle(NODE_NEIGHBOR_CLASS, !isFocus && isNeighbor)
      node.nodeEl.classList.toggle(HIDDEN_CLASS, !isNeighbor)
    }

    for (const edge of canvas.edges.values()) {
      const isVisible = connectedEdges.has(edge)
      this.setEdgeHidden(edge, !isVisible)
    }
  }

  private clearFilter(canvas: Canvas) {
    for (const node of canvas.nodes.values()) {
      node.nodeEl.classList.remove(NODE_NEIGHBOR_CLASS, HIDDEN_CLASS)
    }

    for (const edge of canvas.edges.values()) {
      this.setEdgeHidden(edge, false)
    }
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

  private getConnectedEdges(canvas: Canvas, focusNode: CanvasNode): Set<CanvasEdge> {
    const edges = new Set<CanvasEdge>()
    const outgoing = canvas.edgeFrom.get(focusNode)
    const incoming = canvas.edgeTo.get(focusNode)

    if (outgoing) for (const edge of outgoing) edges.add(edge)
    if (incoming) for (const edge of incoming) edges.add(edge)

    return edges
  }

  private setEdgeHidden(edge: CanvasEdge, hidden: boolean) {
    edge.lineGroupEl.classList.toggle(HIDDEN_CLASS, hidden)
    edge.lineEndGroupEl.classList.toggle(HIDDEN_CLASS, hidden)
    edge.labelElement?.wrapperEl?.classList.toggle(HIDDEN_CLASS, hidden)
  }
}