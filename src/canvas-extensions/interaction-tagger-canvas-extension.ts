import { Canvas, CanvasNode } from "src/types/Canvas"
import CanvasExtension from "./canvas-extension"
import { EXPOSED_DATA } from "./unknown-data-tagger-canvas-extension"

export const TARGET_NODE_DATASET_PREFIX = "target"

export default class InteractionTaggerCanvasExtension extends CanvasExtension {
  onCanvasChanged(_canvas: Canvas): void {}
  onNodesChanged(_canvas: Canvas, _nodes: CanvasNode[]): void {}
  onPopupMenuCreated(_canvas: Canvas): void {}

  onNodeInteraction(canvas: Canvas, node: CanvasNode): void {
    const interactionEl = canvas.nodeInteractionLayer.interactionEl
    if (!interactionEl) return

    for (const dataKey of EXPOSED_DATA) {
      const datasetKey = TARGET_NODE_DATASET_PREFIX + dataKey.charAt(0).toUpperCase() + dataKey.slice(1)

      const dataValue = node?.unknownData[dataKey]
      if (dataValue) interactionEl.dataset[datasetKey] = dataValue
    }
  }
}