import { Canvas } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../canvas-extension"
import { StylableAttribute } from "./style-settings"

export default class NodeStylesExtension extends CanvasExtension {
  isEnabled() { return 'nodeStylingFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectionNodeData.length === 0 || selectionNodeData.length !== canvas.selection.size)
      return

    CanvasHelper.createStyleDropdownMenu(
      canvas, this.plugin.settings.getSetting('nodeStyleSettings'),
      selectionNodeData[0].styleAttributes ?? {},
      (attribute, value) => this.setStyleAttributeForSelection(canvas, attribute, value)
    )
  }

  private setStyleAttributeForSelection(canvas: Canvas, attribute: StylableAttribute, value: string | null): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    for (const nodeData of selectionNodeData) {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue

      // Only apply the attribute if the node type is allowed
      if (attribute.nodeTypes && !attribute.nodeTypes.includes(nodeData.type)) continue

      node.setData({
        ...nodeData,
        styleAttributes: {
          ...nodeData.styleAttributes,
          [attribute.datasetKey]: value
        }
      })
    }
    
    canvas.pushHistory(canvas.getData())
  }
}