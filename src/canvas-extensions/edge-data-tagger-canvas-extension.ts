import { Canvas, CanvasEdge, CanvasEdgeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import AdvancedCanvasSettingsManager from "src/settings"

export function getExposedEdgeData(settings: AdvancedCanvasSettingsManager): (keyof CanvasEdgeData)[] {
  const exposedData: (keyof CanvasEdgeData)[] = []

  if (settings.getSetting('edgesStylingFeatureEnabled')) exposedData.push('edgeStyle')
  if (settings.getSetting('portalsFeatureEnabled')) exposedData.push('isUnsaved')

  return exposedData
}

export default class EdgeDataTaggerCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeChanged,
      (_canvas: Canvas, edge: CanvasEdge) => {
        const edgeData = edge?.getData()
        if (!edgeData) return

        for (const dataKey of getExposedEdgeData(this.plugin.settings)) {
          const dataValue = edgeData[dataKey]
          
          if (!dataValue) delete edge.path.display.dataset[dataKey]
          else edge.path.display.dataset[dataKey] = dataValue as string
        }
      }
    ))
  }
}