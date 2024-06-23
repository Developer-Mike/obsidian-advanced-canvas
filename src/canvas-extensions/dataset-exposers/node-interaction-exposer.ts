import { Canvas, CanvasNode } from "src/@types/Canvas"
import { getExposedNodeData } from "./node-exposer"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../../core/canvas-extension"

export const TARGET_NODE_DATASET_PREFIX = "target"

export default class NodeInteractionExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeInteraction,
      (canvas: Canvas, node: CanvasNode) => {
        const interactionEl = canvas.nodeInteractionLayer.interactionEl
        if (!interactionEl) return
    
        for (const dataKey of getExposedNodeData(this.plugin.settings)) {
          const datasetKey = TARGET_NODE_DATASET_PREFIX + dataKey.toString().charAt(0).toUpperCase() + dataKey.toString().slice(1)
    
          const dataValue = node?.getData()[dataKey]

          if (!dataValue) delete interactionEl.dataset[datasetKey]
          else interactionEl.dataset[datasetKey] = dataValue
        }
      }
    ))
  }
}