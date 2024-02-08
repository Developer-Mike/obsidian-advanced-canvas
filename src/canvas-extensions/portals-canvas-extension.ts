import { Canvas, CanvasData, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"

export default class PortalsCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('portalsFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.updatePopupMenu(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DataRequested,
      (data: CanvasData) => this.removePortalCanvasData(data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DataSet.Before,
      (data: CanvasData) => this.addPortalCanvasData(data)
    ))
  }

  updatePopupMenu(canvas: Canvas) {
    const selectedFileNodes = Array.from(canvas.selection).filter(node => node.getData().type === 'file')
    if (canvas.readonly || selectedFileNodes.length !== 1) return

    const fileNode = selectedFileNodes[0]
    const isPortalOpen = fileNode.getData().isPortalOpen

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption(
        'toggle-portal',
        isPortalOpen ? 'Close portal' : 'Open portal',
        isPortalOpen ? 'door-open' : 'door-closed',
        () => {
          canvas.setNodeData(fileNode, 'isPortalOpen', !isPortalOpen)
          this.updatePopupMenu(canvas)
        }
      )
    )
  }

  removePortalCanvasData(data: CanvasData) {
    for (const node of data.nodes) {
      // TODO: Remove node data that is related to portals
    }
  }

  addPortalCanvasData(data: CanvasData) {
    for (const node of data.nodes) {
      // TODO: Add node data that is related to portals
    }
  }
}