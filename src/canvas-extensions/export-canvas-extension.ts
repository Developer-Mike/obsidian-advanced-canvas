import { Canvas, CanvasData, CanvasEdge, CanvasElement, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import * as HtmlToImage from 'html-to-image'
import CanvasExtension from "./canvas-extension"
import { TFile } from "obsidian"

export default class ExportCanvasExtension extends CanvasExtension {
  isEnabled() { return 'betterExportFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'export-selected-nodes',
      name: 'Export selected nodes',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.exportImage(
          canvas, 
          canvas.getSelectionData().nodes
            .map(nodeData => canvas.nodes.get(nodeData.id))
            .filter(node => node !== undefined) as CanvasNode[]
        )
      )
    })

    this.plugin.addCommand({
      id: 'export-all-nodes',
      name: 'Export whole canvas',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.nodes.size > 0,
        (canvas: Canvas) => this.exportImage(canvas, [...canvas.nodes.values()])
      )
    })
  }

  private async exportImage(canvas: Canvas, nodesToExport: CanvasElement[], svg: boolean = true) {
    // Prepare the canvas
    canvas.canvasEl.classList.add('is-exporting')
    canvas.deselectAll()
    canvas.zoomToFit()
    await sleep(1000) // Wait for everything to load

    // Create a filter to only export the desired elements
    const nodeElements = nodesToExport.map((node: CanvasNode) => node.nodeEl)
    const edgeArrowAndPathElements = [...canvas.edges.values()].map((edge: CanvasEdge) => [edge.lineGroupEl, edge.lineEndGroupEl]).flat() // TODO: Don't export all edges
    const edgeLabelElements = [...canvas.edges.values()].map((edge: CanvasEdge) => edge.labelElement.wrapperEl) // TODO: Don't export all edges

    const filter = (element: HTMLElement) => {
      // Filter nodes
      if (element.classList?.contains('canvas-node') && !nodeElements.includes(element)) 
        return false

      if (element.parentElement?.classList?.contains('canvas-edges') && !edgeArrowAndPathElements.includes(element))
        return false

      // Filter edge labels
      if (element.classList?.contains('canvas-path-label-wrapper') && !edgeLabelElements.includes(element)) 
        return false

      return true
    }

    // Generate the image
    const imageDataUri = await HtmlToImage.toSvg(canvas.canvasEl, { filter: filter })
    
    // Reset the canvas
    canvas.canvasEl.classList.remove('is-exporting')

    /*const downloadLink = document.createElement('a')
    downloadLink.href = imageDataUrl
    downloadLink.download = 'canvas-export.png'
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)*/

    const filepath = `${canvas.view.file?.path?.replace('.canvas', '') || 'Untitled'}.${svg ? 'svg' : 'png'}`
    const abstractFile = this.plugin.app.vault.getAbstractFileByPath(filepath)
    if (abstractFile instanceof TFile) await this.plugin.app.vault.delete(abstractFile)

    const file = await this.plugin.app.vault.createBinary(filepath, await fetch(imageDataUri).then((res) => res.arrayBuffer()))
    this.plugin.app.workspace.getLeaf(true).openFile(file)
  }
}