import { Canvas, CanvasNode, CanvasNodeData } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import SettingsManager from "src/settings"
import CanvasExtension from "../canvas-extension"

export function getExposedNodeData(settings: SettingsManager): (keyof CanvasNodeData)[] {
  const exposedData: (keyof CanvasNodeData)[] = []
  
  if (settings.getSetting('nodeStylingFeatureEnabled')) {
    if (settings.getSetting('shapesFeatureEnabled')) exposedData.push('shape')
    if (settings.getSetting('borderStyleFeatureEnabled')) exposedData.push('borderStyle')
  }

  if (settings.getSetting('stickersFeatureEnabled')) exposedData.push('isSticker')
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

        for (const dataKey of getExposedNodeData(this.plugin.settings)) {
          const dataValue = nodeData[dataKey]
          
          if (!dataValue) delete node.nodeEl.dataset[dataKey]
          else node.nodeEl.dataset[dataKey] = dataValue
        }
      }
    ))
  }
}