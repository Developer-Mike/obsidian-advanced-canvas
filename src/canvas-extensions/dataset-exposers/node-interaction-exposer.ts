import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "../canvas-extension"
import { getExposedNodeData } from "./node-exposer"
import PortalsCanvasExtension from "../portals-canvas-extension"

export const TARGET_NODE_DATASET_PREFIX = "target"

export default class NodeInteractionExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-interaction',
      (canvas: Canvas, node: CanvasNode) => {
        const nodeData = node?.getData()
        if (!nodeData) return
        
        const interactionEl = canvas.nodeInteractionLayer.interactionEl
        if (!interactionEl) return

        for (const exposedDataKey of getExposedNodeData(this.plugin.settings)) {
          const datasetPairs = nodeData[exposedDataKey] instanceof Object
            ? Object.entries(nodeData[exposedDataKey])
            : [[exposedDataKey, nodeData[exposedDataKey]]]

          for (const [key, value] of datasetPairs as [string, string][]) {
            const modifiedKey = TARGET_NODE_DATASET_PREFIX + key.toString().charAt(0).toUpperCase() + key.toString().slice(1)
            
            if (!value) delete interactionEl.dataset[modifiedKey]
            else interactionEl.dataset[modifiedKey] = value
          }
        }

        // Custom treatment for portal nodes
        if (PortalsCanvasExtension.isPortalElement(node)) interactionEl.dataset.isFromPortal = 'true'
        else delete interactionEl.dataset.isFromPortal
      }
    ))
  }
}