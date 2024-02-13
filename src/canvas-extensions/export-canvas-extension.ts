import { Canvas, CanvasData } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"
import * as HtmlToImage from 'html-to-image'

export default class ExportCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('betterExportFeatureEnabled')) return

    this.plugin.addCommand({
      id: 'export-selected-nodes',
      name: 'Export selected nodes',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.exportImage(canvas, canvas.getSelectionData())
      )
    })

    this.plugin.addCommand({
      id: 'export-all-nodes',
      name: 'Export whole canvas',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.nodes.size > 0,
        (canvas: Canvas) => this.exportImage(canvas, canvas.getData())
      )
    })
  }

  private async exportImage(canvas: Canvas, dataToExport: CanvasData) {
    const targetElements = [] as HTMLElement[]

    // Add all nodes and remove selection style
    for (const node of dataToExport.nodes) {
      const nodeEl = canvas.nodes.get(node.id)?.nodeEl
      if (!nodeEl) continue

      nodeEl.classList.remove('is-focused')
      nodeEl.classList.remove('is-selected')
      nodeEl.classList.remove('is-editing')

      targetElements.push(nodeEl.firstChild as HTMLElement)
    }

    // Add all edges
    for (const edge of dataToExport.edges) {
      const edgeEl = canvas.edges.get(edge.id)?.path?.interaction
      if (!edgeEl) continue

      targetElements.push(edgeEl)
    }

    // Generate the image
    const imageDataUrl = await HtmlToImage.toPng(canvas.canvasEl, {
      backgroundColor: 'transparent',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      },
      width: canvas.canvasEl.offsetWidth,
      height: canvas.canvasEl.offsetHeight,
      quality: 1
    })

    // Restore the selection style
    canvas.updateSelection(() => {})

    const downloadLink = document.createElement('a')
    downloadLink.href = imageDataUrl
    downloadLink.download = 'canvas-export.png'
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }
}