import { Canvas, CanvasEdge } from "src/@types/Canvas"
import SettingsManager from "src/settings"
import CanvasExtension from "../canvas-extension"
import { CanvasEdgeData } from "src/@types/AdvancedJsonCanvas"

export function getExposedEdgeData(settings: SettingsManager): (keyof CanvasEdgeData)[] {
  const exposedData: (keyof CanvasEdgeData)[] = []

  if (settings.getSetting('edgesStylingFeatureEnabled')) exposedData.push('styleAttributes')

  return exposedData
}

export default class EdgeExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-changed',
      (_canvas: Canvas, edge: CanvasEdge) => {
        const edgeData = edge?.getData()
        if (!edgeData) return

        for (const exposedDataKey of getExposedEdgeData(this.plugin.settings)) {
            const datasetPairs = edgeData[exposedDataKey] instanceof Object
              ? Object.entries(edgeData[exposedDataKey])
              : [[exposedDataKey, edgeData[exposedDataKey]]]

            for (const [key, value] of datasetPairs) {
              const stringifiedKey = key?.toString()
              if (!stringifiedKey) continue

              if (!value) {
                delete edge.path.display.dataset[stringifiedKey]

                if (edge.fromLineEnd?.el) delete edge.fromLineEnd.el.dataset[stringifiedKey]
                if (edge.toLineEnd?.el) delete edge.toLineEnd.el.dataset[stringifiedKey]
              } else {
                edge.path.display.dataset[stringifiedKey] = value.toString()

                if (edge.fromLineEnd?.el) edge.fromLineEnd.el.dataset[stringifiedKey] = value.toString()
                if (edge.toLineEnd?.el) edge.toLineEnd.el.dataset[stringifiedKey] = value.toString()
              }
            }
        }
      }
    ))
  }
}