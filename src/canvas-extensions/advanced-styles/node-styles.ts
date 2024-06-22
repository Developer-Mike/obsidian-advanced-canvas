import { Canvas, CanvasNode } from "src/@types/Canvas"
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

  private onNodeChanged(_canvas: Canvas, node: CanvasNode): void {
    const nodeData = node.getData()

    // Apply the style attributes to the node
    if (nodeData.styleAttributes) {
      for (const [key, value] of Object.entries(nodeData.styleAttributes)) {
        if (value === null) delete node.nodeEl.dataset[key]
        else node.nodeEl.dataset[key] = value
      }
    }
  }
}