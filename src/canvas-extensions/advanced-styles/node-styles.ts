import { Canvas, CanvasNode } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../canvas-extension"

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

  onPopupMenuCreated(canvas: Canvas): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectionNodeData.length === 0)
      return

    CanvasHelper.createStyleDropdownMenu(
      canvas, this.plugin.settings.getSetting('nodeStyleSettings'),
      selectionNodeData[0].cssclasses ?? [],
      (cssclass: string) => {
        for (const nodeData of selectionNodeData) {
          const node = canvas.nodes.get(nodeData.id)
          if (!node) continue

          const cssclasses = nodeData.cssclasses ?? []
          if (cssclasses.includes(cssclass)) continue

          node.setData({
            ...nodeData,
            cssclasses: [...cssclasses, cssclass]
          }, true)
        }
      },
      (cssclasses: string[]) => {
        for (const nodeData of selectionNodeData) {
          const node = canvas.nodes.get(nodeData.id)
          if (!node) continue

          const currentCssclasses = nodeData.cssclasses ?? []

          node.setData({
            ...nodeData,
            cssclasses: currentCssclasses.filter(c => !cssclasses.includes(c))
          }, true)
        }
      }
    )
  }

  onNodeChanged(_canvas: Canvas, node: CanvasNode): void {
    const nodeData = node.getData()
    const cssclasses = nodeData.cssclasses ?? []

    // Remove all previous css classes
    const allCssclasses = this.plugin.settings.getSetting('nodeStyleSettings')
      .flatMap(s => s.values)
      .map(v => v.cssclass)
      .filter(c => c !== null) as string[]

    for (const cssclass of allCssclasses) {
      node.nodeEl.classList.remove(cssclass)
    }

    // Add new css classes
    for (const cssclass of cssclasses) {
      node.nodeEl.classList.add(cssclass)
    }
  }
}