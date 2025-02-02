import { BBox, Canvas, CanvasData, CanvasEdge, CanvasElement, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import * as HtmlToImage from 'html-to-image'
import CanvasExtension from "./canvas-extension"
import { TFile } from "obsidian"
import BBoxHelper from "src/utils/bbox-helper"
import DebugHelper from "src/utils/debug-helper"

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
        (canvas: Canvas) => this.exportImage(canvas, null)
      )
    })
  }

  // TODO: Fix max image size
  // TODO: Add UI for options
  private async exportImage(canvas: Canvas, nodesToExport: CanvasNode[] | null, svg: boolean = true, garbledText: boolean = false, noFontExport: boolean = true, watermark: boolean = false) {
    const isWholeCanvas = nodesToExport === null
    if (!nodesToExport) nodesToExport = [...canvas.nodes.values()]
    
    // Filter all edges that should be exported
    const nodesToExportIds = nodesToExport.map(node => node.getData().id)
    const edgesToExport = [...canvas.edges.values()]
      .filter(edge => {
        const edgeData = edge.getData()
        return nodesToExportIds.includes(edgeData.fromNode) && nodesToExportIds.includes(edgeData.toNode)
      })

    // Prepare the canvas
    canvas.canvasEl.classList.add('is-exporting')
    if (garbledText) canvas.canvasEl.classList.add('is-text-garbled')

    const cachedSelection = new Set(canvas.selection)
    canvas.deselectAll()

    // Cache the current viewport
    const cachedViewport = { x: canvas.x, y: canvas.y, zoom: canvas.zoom }

    // Calculate the bounding box of the elements to export
    let targetBoundingBox = CanvasHelper.getBBox([...nodesToExport, ...edgesToExport])

    // Offset bounding box to respect the aspect ratio
    const actualAspectRatio = canvas.canvasRect.width / canvas.canvasRect.height
    const targetAspectRatio = (targetBoundingBox.maxX - targetBoundingBox.minX) / (targetBoundingBox.maxY - targetBoundingBox.minY)

    if (actualAspectRatio > targetAspectRatio) {
      // The actual bounding box is wider than the target bounding box
      const targetHeight = targetBoundingBox.maxY - targetBoundingBox.minY
      const actualWidth = targetHeight * actualAspectRatio

      targetBoundingBox.maxX = targetBoundingBox.minX + actualWidth
    } else {
      // The actual bounding box is taller than the target bounding box
      const targetWidth = targetBoundingBox.maxX - targetBoundingBox.minX
      const actualHeight = targetWidth / actualAspectRatio

      targetBoundingBox.maxY = targetBoundingBox.minY + actualHeight
    }

    // Zoom to the bounding box of the elements to export
    CanvasHelper.zoomToRealBBox(canvas, targetBoundingBox) // Zoom to the bounding box (without padding)
    canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom) // Accelerate zoomToBbox by setting the canvas to the desired position and zoom
    await sleep(10) // Wait for viewport to update

    // Calculate bounding boxes that also contain the complete edge paths
    // Not before, because some nodes might have been outside the viewport
    let canvasScale = parseFloat(canvas.canvasEl.style.transform.match(/scale\((\d+(\.\d+)?)\)/)?.[1] || '1')
    const edgePathsBBox = edgesToExport.map(edge => {
      const edgeCenter = edge.getCenter()
      const labelWidth = edge.labelElement ? edge.labelElement.wrapperEl.getBoundingClientRect().width / canvasScale : 0

      return { minX: edgeCenter.x - labelWidth / 2, minY: edgeCenter.y, maxX: edgeCenter.x + labelWidth / 2, maxY: edgeCenter.y }
    })
    targetBoundingBox = BBoxHelper.combineBBoxes([targetBoundingBox, ...edgePathsBBox])

    CanvasHelper.zoomToRealBBox(canvas, BBoxHelper.scaleBBox(targetBoundingBox, 1.1)) // Zoom to the bounding box with custom padding
    canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom) // Accelerate zoomToBbox by setting the canvas to the desired position and zoom
    await sleep(10) // Wait for viewport to update

    // Calculate the output image size
    const canvasViewportBBox = canvas.getViewportBBox()
    canvasScale = parseFloat(canvas.canvasEl.style.transform.match(/scale\((\d+(\.\d+)?)\)/)?.[1] || '1')
    let width = (canvasViewportBBox.maxX - canvasViewportBBox.minX) * canvasScale
    let height = (canvasViewportBBox.maxY - canvasViewportBBox.minY) * canvasScale

    if (actualAspectRatio > targetAspectRatio)
      width = height * targetAspectRatio // The actual bounding box is wider than the target bounding box
    else height = width / targetAspectRatio // The actual bounding box is taller than the target bounding box

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
    const options: any = {
      height: height,
      width: width,
      filter: filter
    }
    if (noFontExport) options.fontEmbedCSS = ""
    const imageDataUri = svg ? await HtmlToImage.toSvg(canvas.canvasEl, options) : await HtmlToImage.toPng(canvas.canvasEl, options)
    
    // Reset the canvas
    canvas.canvasEl.classList.remove('is-exporting')
    if (garbledText) canvas.canvasEl.classList.remove('is-text-garbled')
    canvas.updateSelection(() => canvas.selection = cachedSelection)
    canvas.setViewport(cachedViewport.x, cachedViewport.y, cachedViewport.zoom)

    let baseFilename = `${canvas.view.file?.basename || 'Untitled'}`
    if (!isWholeCanvas) baseFilename += ` - Selection of ${nodesToExport.length}`
    const filename = `${baseFilename}.${svg ? 'svg' : 'png'}`
    
    const downloadEl = document.createElement('a')
    downloadEl.href = imageDataUri
    downloadEl.download = filename
    downloadEl.click()
  }
}