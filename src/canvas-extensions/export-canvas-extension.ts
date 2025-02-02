import { BBox, Canvas, CanvasData, CanvasEdge, CanvasElement, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import * as HtmlToImage from 'html-to-image'
import CanvasExtension from "./canvas-extension"
import { Modal, Notice, ProgressBarComponent, Setting, TFile } from "obsidian"
import BBoxHelper from "src/utils/bbox-helper"
import AdvancedCanvasPlugin from "src/main"

const MAX_ALLOWED_LOADING_TIME = 10_000
const MAX_PIXEL_RATIO = 20

export default class ExportCanvasExtension extends CanvasExtension {
  isEnabled() { return 'betterExportFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'export-all-as-image',
      name: 'Export canvas as image',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.nodes.size > 0,
        (canvas: Canvas) => this.showExportImageSettingsModal(canvas, null)
      )
    })

    this.plugin.addCommand({
      id: 'export-selected-as-image',
      name: 'Export selected nodes as image',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.showExportImageSettingsModal(
          canvas, 
          canvas.getSelectionData().nodes
            .map(nodeData => canvas.nodes.get(nodeData.id))
            .filter(node => node !== undefined) as CanvasNode[]
        )
      )
    })
  }

  private async showExportImageSettingsModal(canvas: Canvas, nodesToExport: CanvasNode[] | null) {
    const modal = new Modal(this.plugin.app)
    modal.setTitle('Export image settings')

    // Create ref to dynamic settings
    let pixelRatioSetting: Setting | null = null
    let noFontExportSetting: Setting | null = null
    const updateDynamicSettings = () => {
      if (svg) {
        pixelRatioSetting?.settingEl?.hide()
        noFontExportSetting?.settingEl?.show()
      } else {
        pixelRatioSetting?.settingEl?.show()
        noFontExportSetting?.settingEl?.hide()
      }
    }

    let svg = true
    new Setting(modal.contentEl)
      .setName('Export file format')
      .setDesc('Choose the file format to export the canvas as.')
      .addDropdown(dropdown => dropdown
        .addOptions({
          svg: 'SVG',
          png: 'PNG'
        })
        .setValue(svg ? 'svg' : 'png')
        .onChange(value => {
          svg = value === 'svg'
          updateDynamicSettings()
        })
      )

    const nodesBBox = CanvasHelper.getBBox(nodesToExport ?? [...canvas.nodes.values()])
    const nodesBBoxSize = { width: nodesBBox.maxX - nodesBBox.minX, height: nodesBBox.maxY - nodesBBox.minY }
    const canvasElSize = { width: canvas.canvasEl.clientWidth, height: canvas.canvasEl.clientHeight }
    const suggestedPixelRatio = Math.round(Math.min(nodesBBoxSize.width / canvasElSize.width, nodesBBoxSize.height / canvasElSize.height))
    let pixelRatio = Math.min(MAX_PIXEL_RATIO, suggestedPixelRatio)
    pixelRatioSetting = new Setting(modal.contentEl)
      .setName('Pixel ratio')
      .setDesc('Higher pixel ratios result in higher resolution images but also larger file sizes.')
      .addSlider(slider => slider
        .setDynamicTooltip()
        .setLimits(1, MAX_PIXEL_RATIO, 1)
        .setValue(pixelRatio)
        .onChange(value => pixelRatio = value)
      )
    
    let noFontExport = true
    noFontExportSetting = new Setting(modal.contentEl)
      .setName('Skip font export')
      .setDesc('This will not include the fonts in the exported SVG. This will make the SVG file smaller.')
      .addToggle(toggle => toggle
        .setValue(noFontExport)
        .onChange(value => noFontExport = value)
      )

    let watermark = false
    new Setting(modal.contentEl)
      .setName('Show logo')
      .setDesc('This will add an Obsidian + Advanced Canvas logo to the bottom left.')
      .addToggle(toggle => toggle
        .setValue(watermark)
        .onChange(value => watermark = value)
      )

    let garbledText = false
    new Setting(modal.contentEl)
      .setName('Privacy mode')
      .setDesc('This will obscure any text on your canvas.')
      .addToggle(toggle => toggle
        .setValue(garbledText)
        .onChange(value => garbledText = value)
      )

    new Setting(modal.contentEl)
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(async () => {
          modal.close()

          this.exportImage(
            canvas, 
            nodesToExport, 
            svg, 
            svg ? 1 : pixelRatio, 
            svg ? noFontExport : false,
            watermark,
            garbledText
          )
        })
      )

    updateDynamicSettings()
    modal.open()
  }

  // TODO: Implement watermark
  private async exportImage(canvas: Canvas, nodesToExport: CanvasNode[] | null, svg: boolean, pixelRatio: number, noFontExport: boolean, watermark: boolean, garbledText: boolean) {
    const isWholeCanvas = nodesToExport === null
    if (!nodesToExport) nodesToExport = [...canvas.nodes.values()]
    
    // Filter all edges that should be exported
    const nodesToExportIds = nodesToExport.map(node => node.getData().id)
    const edgesToExport = [...canvas.edges.values()]
      .filter(edge => {
        const edgeData = edge.getData()
        return nodesToExportIds.includes(edgeData.fromNode) && nodesToExportIds.includes(edgeData.toNode)
      })

    // Create loading overlay
    new Notice('Exporting the canvas. Please wait...')
    const interactionBlocker = document.createElement('div')
    interactionBlocker.classList.add('modal-container', 'mod-dim')
    document.body.appendChild(interactionBlocker)

    const interactionBlockerBg = document.createElement('div')
    interactionBlockerBg.classList.add('modal-bg')
    interactionBlocker.style.opacity = '0.85'
    interactionBlocker.appendChild(interactionBlockerBg)

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
    let unmountedNodes = nodesToExport.filter(node => node.isContentMounted === false)
    const startTimestamp = performance.now()
    while (unmountedNodes.length > 0 && performance.now() - startTimestamp < MAX_ALLOWED_LOADING_TIME) {
      await sleep(10)

      unmountedNodes = nodesToExport.filter(node => node.isContentMounted === false)
      console.info(`Waiting for ${unmountedNodes.length} nodes to finish loading...`)
    }

    if (unmountedNodes.length === 0) {
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
        pixelRatio: pixelRatio,
        height: height,
        width: width,
        filter: filter
      }
      if (noFontExport) options.fontEmbedCSS = ""
      const imageDataUri = svg ? await HtmlToImage.toSvg(canvas.canvasEl, options) : await HtmlToImage.toPng(canvas.canvasEl, options)

      // Download the image
      let baseFilename = `${canvas.view.file?.basename || 'Untitled'}`
      if (!isWholeCanvas) baseFilename += ` - Selection of ${nodesToExport.length}`
      const filename = `${baseFilename}.${svg ? 'svg' : 'png'}`
      
      const downloadEl = document.createElement('a')
      downloadEl.href = imageDataUri
      downloadEl.download = filename
      downloadEl.click()
    } else {
      const ERROR_MESSAGE = 'Export cancelled: Nodes did not finish loading in time'
      new Notice(ERROR_MESSAGE)
      console.error(ERROR_MESSAGE)
    }
    
    // Reset the canvas
    canvas.canvasEl.classList.remove('is-exporting')
    if (garbledText) canvas.canvasEl.classList.remove('is-text-garbled')
    canvas.updateSelection(() => canvas.selection = cachedSelection)
    canvas.setViewport(cachedViewport.x, cachedViewport.y, cachedViewport.zoom)

    // Remove the loading overlay
    interactionBlocker.remove()
  }
}

export class ExportImageSettingsModal extends Modal {
  private promise: Promise<void>

  constructor(plugin: AdvancedCanvasPlugin) {
    super(plugin.app)
    this.setTitle('What\'s your name?')

    new Setting(this.contentEl)
  }

  await() { return this.promise }
}