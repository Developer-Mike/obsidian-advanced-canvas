import { Canvas, CanvasNode, CanvasNodeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import AdvancedCanvasSettingsManager from "src/settings"

export function getExposedNodeData(settings: AdvancedCanvasSettingsManager): (keyof CanvasNodeData)[] {
  const exposedData: (keyof CanvasNodeData)[] = []
  
  if (settings.getSetting('stickersFeatureEnabled')) exposedData.push('isSticker')
  if (settings.getSetting('shapesFeatureEnabled')) exposedData.push('shape')
  if (settings.getSetting('presentationFeatureEnabled')) exposedData.push('isStartNode')
  if (settings.getSetting('portalsFeatureEnabled')) exposedData.push('portalToFile', 'portalId')

  return exposedData
}

export default class NodeDataTaggerCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeChanged,
      (_canvas: Canvas, node: CanvasNode) => {
        const nodeData = node?.getData()
        if (!nodeData) return

        for (const dataKey of getExposedNodeData(this.plugin.settingsManager)) {
          const dataValue = nodeData[dataKey]
          
          if (dataValue === undefined) delete node.nodeEl.dataset[dataKey]
          else node.nodeEl.dataset[dataKey] = dataValue
        }
      }
    ))
  }
}