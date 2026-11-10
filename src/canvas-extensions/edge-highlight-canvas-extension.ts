import { Canvas, CanvasEdge, CanvasElement } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export default class EdgeHighlightCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'edgeHighlightEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed',
      (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas, oldSelection)
    ))
  }

  private onSelectionChanged(canvas: Canvas, oldSelection: Set<CanvasElement>) {
    const selectedNodesData = canvas.getSelectionData().nodes

    const outgoingEdges = new Set(selectedNodesData.flatMap(nodeData =>
      Array.from(canvas.edgeFrom.get(canvas.nodes.get(nodeData.id)!) ?? [])
    ))

    const incomingEdges = this.plugin.settings.getSetting("highlightIncomingEdges") ?
      new Set(selectedNodesData.flatMap(nodeData =>
        Array.from(canvas.edgeTo.get(canvas.nodes.get(nodeData.id)!) ?? [])
      )) : new Set()

    for (const edge of canvas.edges.values()) {
      const isFocused = canvas.selection.has(edge) || outgoingEdges.has(edge) || incomingEdges.has(edge)

      this.toggleEdgeClass(edge, "is-focused", isFocused)
      this.toggleEdgeClass(edge, "outgoing", outgoingEdges.has(edge))
      this.toggleEdgeClass(edge, "incoming", incomingEdges.has(edge))
    }
  }

  private toggleEdgeClass(edge: CanvasEdge, classname: string, value: boolean) {
    edge.lineGroupEl.classList.toggle(classname, value)
    edge.lineEndGroupEl?.classList?.toggle(classname, value)
    edge.labelElement?.textareaEl?.classList?.toggle(classname, value)
  }
}
