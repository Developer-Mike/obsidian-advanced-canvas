import { Canvas, CanvasNode } from "src/@types/Canvas"
import SettingsManager from "src/settings"
import CanvasExtension from "../canvas-extension"
import { CanvasGroupNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"

export function getExposedNodeData(settings: SettingsManager): (keyof CanvasNodeData)[] {
  const exposedData: (keyof CanvasNodeData)[] = []

  if (settings.getSetting('nodeStylingFeatureEnabled')) exposedData.push('styleAttributes')
  if (settings.getSetting('collapsibleGroupsFeatureEnabled')) exposedData.push('collapsed' satisfies keyof CanvasGroupNodeData as keyof CanvasNodeData)
  if (settings.getSetting('portalsFeatureEnabled')) exposedData.push('isPortalLoaded' as keyof CanvasNodeData)

  return exposedData
}

export default class NodeExposerExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (_canvas: Canvas, node: CanvasNode) => {
        const nodeData = node?.getData()
        if (!nodeData) return

        this.setDataAttributes(node.nodeEl, nodeData)
      }
    ))

    // Expose data in editing iframe too
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (_canvas: Canvas, node: CanvasNode, editing: boolean) => {
        if (!editing) return

        const nodeData = node.getData()
        if (!nodeData) return

        const iframe = node.nodeEl.querySelector('iframe')
        if (!iframe) return

        const iframeBody = iframe.contentDocument?.body
        if (!iframeBody) return

        iframeBody.classList.add('canvas-node-iframe-body')
        this.setDataAttributes(iframeBody, nodeData)
      }
    ))
  }

  private setDataAttributes(element: HTMLElement, nodeData: CanvasNodeData) {
    for (const exposedDataKey of getExposedNodeData(this.plugin.settings)) {
      const datasetPairs = nodeData[exposedDataKey] instanceof Object
        ? Object.entries(nodeData[exposedDataKey])
        : [[exposedDataKey, nodeData[exposedDataKey]]]

      for (const [key, value] of datasetPairs as [string, string][]) {
        if (!value) delete element.dataset[key]
        else element.dataset[key] = value
      }
    }
  }
}
