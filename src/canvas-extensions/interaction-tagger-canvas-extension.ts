import { Canvas, CanvasNode } from "src/types/Canvas"
import { EXPOSED_DATA } from "./unknown-data-tagger-canvas-extension"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/events/events"

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
    
        for (const dataKey of EXPOSED_DATA) {
          const datasetKey = TARGET_NODE_DATASET_PREFIX + dataKey.charAt(0).toUpperCase() + dataKey.slice(1)
    
          const dataValue = node?.unknownData[dataKey]
          if (dataValue) interactionEl.dataset[datasetKey] = dataValue
        }
      }
    ))
  }
}