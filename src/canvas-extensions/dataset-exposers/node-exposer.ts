import { Canvas, CanvasNode, CanvasNodeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/canvas-events"
import SettingsManager from "src/settings"
import CanvasExtension from "../../core/canvas-extension"

export function getExposedNodeData(settings: SettingsManager): (keyof CanvasNodeData)[] {
  const exposedData: (keyof CanvasNodeData)[] = []

  if (settings.getSetting('nodeStylingFeatureEnabled')) exposedData.push('styleAttributes')
  if (settings.getSetting('collapsibleGroupsFeatureEnabled')) exposedData.push('isCollapsed')
  if (settings.getSetting('presentationFeatureEnabled')) exposedData.push('isStartNode')
  if (settings.getSetting('portalsFeatureEnabled')) exposedData.push('portalToFile', 'portalId')

  return exposedData
}

export default class NodeExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeChanged,
      (_canvas: Canvas, node: CanvasNode) => {
        const nodeData = node?.getData()
        if (!nodeData) return

        for (const exposedDataKey of getExposedNodeData(this.plugin.settings)) {
          const datasetPairs = nodeData[exposedDataKey] instanceof Object
            ? Object.entries(nodeData[exposedDataKey])
            : [[exposedDataKey, nodeData[exposedDataKey]]]

          for (const [key, value] of datasetPairs) {
            if (key === undefined) continue
            
            if (!value) delete node.nodeEl.dataset[key.toString()]
            else node.nodeEl.dataset[key.toString()] = value
          }
        }
      }
    ))
  }
}