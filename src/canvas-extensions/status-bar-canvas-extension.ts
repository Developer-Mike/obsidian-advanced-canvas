import { Canvas, CanvasElement } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export default class StatusBarCanvasExtension extends CanvasExtension {
  private positionBarEl: HTMLElement | null
  private sizeBarEl: HTMLElement | null

  isEnabled() { return true }

  init() {
    // FIMXE: Allow disabling
    this.positionBarEl = this.plugin.addStatusBarItem()
    this.sizeBarEl = this.plugin.addStatusBarItem()

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed',
      (canvas: Canvas, _oldSelection: Set<CanvasElement>, _updateSelection: (update: () => void) => void) => this.onSelectionChanged(canvas)
    ))
  }

  private onSelectionChanged(canvas: Canvas) {
    const selectionData = canvas.getSelectionData()
    if (selectionData.nodes.length !== 1) {
      this.positionBarEl?.empty()
      this.sizeBarEl?.empty()
    }

    const selectedNode = selectionData.nodes.first()
    if (!selectedNode) return

    this.positionBarEl?.empty()
    this.positionBarEl?.createEl('span', { text: `x${selectedNode.x} y${selectedNode.y}` })

    this.sizeBarEl?.empty()
    this.sizeBarEl?.createEl('span', { text: `${selectedNode.width}x${selectedNode.height}` })
  }
}
