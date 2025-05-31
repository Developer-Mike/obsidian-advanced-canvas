import { Canvas, CanvasElement } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export default class EdgeHighlightCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'edgeHighlightEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed',
      (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas, oldSelection, updateSelection)
    ))
  }

  private onSelectionChanged(canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) {

  }
}