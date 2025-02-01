import { Canvas, CanvasData, CanvasEdge, CanvasElement, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import * as HtmlToImage from 'html-to-image'
import CanvasExtension from "./canvas-extension"
import { TFile } from "obsidian"

const MAX_ALLOWED_LOADING_TIME = 10_000

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

  private async exportImage(canvas: Canvas, nodesToExport: CanvasNode[], svg: boolean = true) {
    // Filter all edges that should be exported
    const nodesToExportIds = nodesToExport.map(node => node.getData().id)
    const edgesToExport = [...canvas.edges.values()]
      .filter(edge => {
        const edgeData = edge.getData()
        return nodesToExportIds.includes(edgeData.fromNode) && nodesToExportIds.includes(edgeData.toNode)
      })

    // Prepare the canvas
    canvas.canvasEl.classList.add('is-exporting')

    const cachedSelection = new Set(canvas.selection)
    canvas.deselectAll()

    const cachedViewport = { x: canvas.x, y: canvas.y, zoom: canvas.zoom }
    const boundingBox = CanvasHelper.getBBox([...nodesToExport, ...edgesToExport])
    canvas.zoomToBbox(boundingBox)
    
    // Accelerate zoomToBbox by setting the canvas to the desired position and zoom
    canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom)

    // Wait for everything to render
    const startTimestamp = performance.now()
    let unmountedNodes = nodesToExport.filter(node => node.isContentMounted === false)
    const unmountedNodesStartCount = unmountedNodes.length
    while (unmountedNodes.length > 0 && performance.now() - startTimestamp < MAX_ALLOWED_LOADING_TIME) {
      await sleep(10)

      unmountedNodes = nodesToExport.filter(node => node.isContentMounted === false)
      console.log('Nodes not loaded:', unmountedNodes.length, '/', unmountedNodesStartCount) // TODO: User friendly loading indicator
    }

    // If the loading time exceeds the limit, cancel the export
    if (unmountedNodes.length > 0) {
      console.error('Export cancelled: Nodes did not finish loading in time') // TODO: User friendly error message
      return
    }

    // Create a filter to only export the desired elements
    const nodeElements = nodesToExport
      .map(node => node.nodeEl)

    const edgePathAndArrowElements = edgesToExport
      .map(edge => [edge.lineGroupEl, edge.lineEndGroupEl])
      .flat()

    const edgeLabelElements = edgesToExport
      .map(edge => edge.labelElement?.wrapperEl)
      .filter(labelElement => labelElement !== undefined) as HTMLElement[]

    const filter = (element: HTMLElement) => {
      // Filter nodes
      if (element.classList?.contains('canvas-node') && !nodeElements.includes(element)) 
        return false

      // Filter edge paths and arrows
      if (element.parentElement?.classList?.contains('canvas-edges') && !edgePathAndArrowElements.includes(element))
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

    canvas.updateSelection(() => canvas.selection = cachedSelection)

    canvas.setViewport(cachedViewport.x, cachedViewport.y, cachedViewport.zoom)

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