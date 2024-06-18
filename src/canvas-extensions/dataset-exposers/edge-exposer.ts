import { Canvas, CanvasEdge, CanvasEdgeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import SettingsManager from "src/settings"
import CanvasExtension from "../canvas-extension"

export function getExposedEdgeData(settings: SettingsManager): (keyof CanvasEdgeData)[] {
  const exposedData: (keyof CanvasEdgeData)[] = []

  if (settings.getSetting('edgesStylingFeatureEnabled')) exposedData.push('edgeStyle')
  if (settings.getSetting('portalsFeatureEnabled')) exposedData.push('isUnsaved')

  return exposedData
}

export default class EdgeExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
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