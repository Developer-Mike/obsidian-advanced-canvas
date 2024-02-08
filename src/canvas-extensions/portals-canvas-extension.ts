import { Canvas, CanvasNode } from "src/@types/Canvas"
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
      CanvasEvent.NodesChanged,
      (canvas: Canvas, nodes: CanvasNode[]) => this.onNodesChanged(canvas, nodes)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasSaved.Before,
      (canvas: Canvas) => this.beforeCanvasSaved(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasSaved.After,
      (canvas: Canvas) => this.afterCanvasSaved(canvas)
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

  onNodesChanged(canvas: Canvas, nodes: CanvasNode[]) {
    for (const node of nodes) {
      const nodeData = node.getData()
      if (nodeData.type !== 'file') continue

      if (!nodeData.isPortalOpen) {
        console.log(`Close portal for file: ${node.getData().file}`)
      } else {
        console.log(`Open portal for file: ${node.getData().file}`)
      }
    }
  }

  beforeCanvasSaved(canvas: Canvas) {
    const canvasData = canvas.getData()
    console.log('Canvas before saved', canvasData)
  }

  afterCanvasSaved(canvas: Canvas) {
    const canvasData = canvas.getData()
    console.log('Canvas after saved', canvasData)
  }
}