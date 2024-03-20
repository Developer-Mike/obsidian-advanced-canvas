import { Canvas, CanvasNode } from "src/@types/Canvas"
import { getExposedNodeData } from "./node-data-tagger-canvas-extension"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/core/events"

export const TARGET_NODE_DATASET_PREFIX = "target"

export default class InteractionTaggerCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    // Register events
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