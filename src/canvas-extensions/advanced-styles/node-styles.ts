import { Canvas, CanvasNode } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../canvas-extension"
import SettingsManager from "src/settings"

export default class NodeStylesExtension extends CanvasExtension {
  isEnabled() { return 'nodeStylingFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeChanged,
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
    ))
  }
  
  private onPopupMenuCreated(canvas: Canvas): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectionNodeData.length === 0)
      return

    CanvasHelper.createStyleDropdownMenu(
      canvas, this.plugin.settings.getSetting('nodeStyleSettings'),
      selectionNodeData[0].cssclasses ?? [],
      (addCssclasses, removeCssclasses) => this.updateCssclassesOfSelection(canvas, addCssclasses, removeCssclasses)
    )
  }

  private updateCssclassesOfSelection(canvas: Canvas, addCssclasses: string[], removeCssclasses: string[]): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    for (const nodeData of selectionNodeData) {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue

      const currentCssclasses = nodeData.cssclasses ?? []

      node.setData({
        ...nodeData,
        cssclasses: [
          ...currentCssclasses.filter(c => !removeCssclasses.includes(c)),
          ...addCssclasses.filter(c => !currentCssclasses.includes(c))
        ]
      }, true)
    }
  }

  private onNodeChanged(_canvas: Canvas, node: CanvasNode): void {
    const nodeData = node.getData()
    const cssclasses = nodeData.cssclasses ?? []

    // Remove all possible css classes
    const allCssclasses = this.plugin.settings.getSetting('nodeStyleSettings')
      .flatMap(s => s.values)
      .map(v => v.cssclass)
      .filter(c => c !== null) as string[]

    for (const cssclass of allCssclasses) {
      console.log(cssclass)
      node.nodeEl.classList.remove(cssclass)
    }

    // Add new css classes
    for (const cssclass of cssclasses) {
      if (cssclass === '') continue
      node.nodeEl.classList.add(cssclass)
    }
  }
}