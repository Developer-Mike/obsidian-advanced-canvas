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
        const nodeData = node?.getData()
        if (!nodeData) return
        
        const interactionEl = canvas.nodeInteractionLayer.interactionEl
        if (!interactionEl) return

        for (const exposedDataKey of getExposedNodeData(this.plugin.settings)) {
          const datasetPairs = nodeData[exposedDataKey] instanceof Object
            ? Object.entries(nodeData[exposedDataKey])
            : [[exposedDataKey, nodeData[exposedDataKey]]]

          for (const [key, value] of datasetPairs) {
            const modifiedKey = TARGET_NODE_DATASET_PREFIX + key.toString().charAt(0).toUpperCase() + key.toString().slice(1)
            
            if (!value) delete interactionEl.dataset[modifiedKey]
            else interactionEl.dataset[modifiedKey] = value
          }
        }
      }
    ))
  }
}