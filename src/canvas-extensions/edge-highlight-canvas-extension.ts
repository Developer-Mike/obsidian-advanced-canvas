import { Canvas, CanvasElement } from "src/@types/Canvas"
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
    const connectedEdgesToBeHighlighted = new Set(canvas.getSelectionData().nodes
      .flatMap(nodeData => [
        ...canvas.edgeFrom.get(canvas.nodes.get(nodeData.id)!) ?? [], 
        ...(this.plugin.settings.getSetting("highlightIncomingEdges") ? 
          canvas.edgeTo.get(canvas.nodes.get(nodeData.id)!) ?? [] :
          []
        )
      ]))

    for (const edge of canvas.edges.values()) {
      edge.lineGroupEl.classList.toggle("is-focused", 
        canvas.selection.has(edge) || connectedEdgesToBeHighlighted.has(edge)
      )
    }
  }
}