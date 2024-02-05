import { Canvas, CanvasNode } from "src/types/Canvas"
import CanvasExtension from "./canvas-extension"

export const EXPOSED_DATA = ["isStartNode", "shape"]

export default class UnknownDataTaggerCanvasExtension extends CanvasExtension {
  onCanvasChanged(_canvas: Canvas): void {}

  onNodesChanged(_canvas: Canvas, nodes: CanvasNode[]): void {
    for (const node of nodes) {
      const nodeData = node?.unknownData
      if (!nodeData) continue

      for (const dataKey of EXPOSED_DATA) {
        const dataValue = nodeData[dataKey]
        node.nodeEl.dataset[dataKey] = dataValue
      }
    }
  }

  onPopupMenuCreated(_canvas: Canvas): void {}
  onNodeInteraction(_canvas: Canvas, _node: CanvasNode): void {}
}