import { BBox, Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import * as HtmlToImage from 'html-to-image'
import CanvasExtension from "./canvas-extension"
import { Modal, Notice, ProgressBarComponent, Setting } from "obsidian"
import BBoxHelper from "src/utils/bbox-helper"
import AdvancedCanvasPlugin from "src/main"
import DebugHelper from "src/utils/debug-helper"

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

    let svg = false
    new Setting(modal.contentEl)
      .setName('Export file format')
      .setDesc('Choose the file format to export the canvas as.')
      .addDropdown(dropdown => dropdown
        .addOptions({
          png: 'PNG',
          svg: 'SVG'
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
    const suggestedPixelRatio = Math.round(Math.max(nodesBBoxSize.width / canvasElSize.width, nodesBBoxSize.height / canvasElSize.height))
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
    const interactionBlocker = this.getInteractionBlocker()
    document.body.appendChild(interactionBlocker)

    // Prepare the canvas
    canvas.canvasEl.classList.add('is-exporting')
    if (garbledText) canvas.canvasEl.classList.add('is-text-garbled')
    let watermarkEl = null

    const cachedSelection = new Set(canvas.selection)
    canvas.deselectAll()

    // Cache the current viewport
    const cachedViewport = { x: canvas.x, y: canvas.y, zoom: canvas.zoom }

    try {
      // Calculate the bounding box of the elements to export
      const targetBoundingBox = CanvasHelper.getBBox([...nodesToExport, ...edgesToExport])
      let enlargedTargetBoundingBox = BBoxHelper.scaleBBox(targetBoundingBox, 1.1) // Enlarge the bounding box by 10%

      // Offset bounding box to respect the aspect ratio
      const actualAspectRatio = canvas.canvasRect.width / canvas.canvasRect.height
      const targetAspectRatio = (enlargedTargetBoundingBox.maxX - enlargedTargetBoundingBox.minX) / (enlargedTargetBoundingBox.maxY - enlargedTargetBoundingBox.minY)

      let adjustedBoundingBox = { ...enlargedTargetBoundingBox }
      if (actualAspectRatio > targetAspectRatio) {
        // The actual bounding box is wider than the target bounding box
        const targetHeight = enlargedTargetBoundingBox.maxY - enlargedTargetBoundingBox.minY
        const actualWidth = targetHeight * actualAspectRatio

        adjustedBoundingBox.maxX = enlargedTargetBoundingBox.minX + actualWidth
      } else {
        // The actual bounding box is taller than the target bounding box
        const targetWidth = enlargedTargetBoundingBox.maxX - enlargedTargetBoundingBox.minX
        const actualHeight = targetWidth / actualAspectRatio

        adjustedBoundingBox.maxY = enlargedTargetBoundingBox.minY + actualHeight
      }

      // Zoom to the bounding box of the elements to export
      CanvasHelper.zoomToRealBBox(canvas, adjustedBoundingBox) // Zoom to the bounding box (without padding)
      canvas.setViewport(canvas.tx, canvas.ty, canvas.tZoom) // Accelerate zoomToBbox by setting the canvas to the desired position and zoom
      await sleep(10) // Wait for viewport to update

      // Calculate bounding boxes that also contain the complete edge paths
      // Not before, because some nodes might have been outside the viewport
      let canvasScale = parseFloat(canvas.canvasEl.style.transform.match(/scale\((\d+(\.\d+)?)\)/)?.[1] || '1')
      const edgePathsBBox = BBoxHelper.combineBBoxes(edgesToExport.map(edge => {
        const edgeCenter = edge.getCenter()
        const labelWidth = edge.labelElement ? edge.labelElement.wrapperEl.getBoundingClientRect().width / canvasScale : 0

        return { minX: edgeCenter.x - labelWidth / 2, minY: edgeCenter.y, maxX: edgeCenter.x + labelWidth / 2, maxY: edgeCenter.y }
      }))
      const enlargedEdgePathsBBox = BBoxHelper.enlargeBBox(edgePathsBBox, 1.1) // Enlarge the bounding box by 10%
      enlargedTargetBoundingBox = BBoxHelper.combineBBoxes([enlargedTargetBoundingBox, enlargedEdgePathsBBox])
      adjustedBoundingBox = BBoxHelper.combineBBoxes([adjustedBoundingBox, enlargedEdgePathsBBox])

      CanvasHelper.zoomToRealBBox(canvas, adjustedBoundingBox) // Zoom to the bounding box
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
      let unloadedNodes = nodesToExport.filter(node => node.initialized === false || node.isContentMounted === false)
      const startTimestamp = performance.now()
      while (unloadedNodes.length > 0 && performance.now() - startTimestamp < MAX_ALLOWED_LOADING_TIME) {
        await sleep(10)

        unloadedNodes = nodesToExport.filter(node => node.initialized === false || node.isContentMounted === false)
        console.info(`Waiting for ${unloadedNodes.length} nodes to finish loading...`)
      }

      if (unloadedNodes.length === 0) {
        // Add watermark
        watermarkEl = watermark ? this.getWatermark(targetBoundingBox) : null
        if (watermarkEl) canvas.canvasEl.appendChild(watermarkEl)

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
    } finally {
      // Reset the canvas
      canvas.canvasEl.classList.remove('is-exporting')
      if (garbledText) canvas.canvasEl.classList.remove('is-text-garbled')
      if (watermarkEl) canvas.canvasEl.removeChild(watermarkEl)
      canvas.updateSelection(() => canvas.selection = cachedSelection)
      canvas.setViewport(cachedViewport.x, cachedViewport.y, cachedViewport.zoom)

      // Remove the loading overlay
      interactionBlocker.remove()
    }
  }

  private getInteractionBlocker() {
    const interactionBlocker = document.createElement('div')
    interactionBlocker.classList.add('modal-container', 'mod-dim')
    document.body.appendChild(interactionBlocker)

    const interactionBlockerBg = document.createElement('div')
    interactionBlockerBg.classList.add('modal-bg')
    interactionBlockerBg.style.opacity = '1'
    interactionBlocker.appendChild(interactionBlockerBg)

    return interactionBlocker
  }

  private getWatermark(bbox: BBox) {
    const watermarkEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    watermarkEl.id = 'watermark-ac'
    watermarkEl.style.transform = `translate(${bbox.minX}px, ${bbox.maxY}px)`

    watermarkEl.setAttrs({
      viewBox: "0 0 143 25",
      width: ((bbox.maxX - bbox.minX) * 0.1).toString(),
      fill: "currentColor"
    })
    watermarkEl.innerHTML = '<path d="M7 14.6a12 12 0 0 1 2.8-.6 10 10 0 0 1 .5-8.8l.4-.7a32.9 32.9 0 0 0 .9-2.3v-1c-.1-.4-.3-.7-.7-1.1-.6-.2-1.1 0-1.6.3L4.2 5.1c-.3.2-.5.6-.6 1l-.4 3a14.6 14.6 0 0 1 3.7 5.5Zm-4-4.2-.1.3-2.8 6c-.2.7-.1 1.4.4 1.9L4.8 23a8.7 8.7 0 0 0 .8-8.7c-.7-1.8-1.9-3.2-2.6-4Z"/><path d="M5.8 23.5H6a23.8 23.8 0 0 1 7.4 1.4c1.2.4 2.3-.5 2.5-1.7a7 7 0 0 1 .8-2.7c-.8-2-1.6-3.2-2.6-4a5 5 0 0 0-2.9-1.3c-1.6-.2-3 .2-4 .5.6 2.3.4 5-1.4 7.8Z"/><path d="m17.4 19.3 2-3c0-.4 0-.7-.2-1a18 18 0 0 1-2-3.5c-.7-1.4-.7-3.5-.8-4.6 0-.4 0-.7-.3-1l-3.4-4.3v.6L12 4l-.5 1-.3.6A11 11 0 0 0 10 9.4c0 1.3 0 2.8.9 4.7h.4c1.1.2 2.3.6 3.5 1.6 1 .8 1.8 2 2.5 3.6ZM39.8 4.5c-6 0-10.3 3.7-10.3 8.9 0 5.1 4.3 8.9 10.3 8.9 5.9 0 10.2-3.8 10.2-9 0-5-4.3-8.8-10.2-8.8Zm0 3.5c3.5 0 6.1 2.1 6.1 5.4 0 3.2-2.6 5.4-6.1 5.4-3.6 0-6.2-2.2-6.2-5.4 0-3.3 2.6-5.4 6.2-5.4Zm15.7 12.6c.8.9 2.5 1.7 4.6 1.7 4.3 0 6.8-3 6.8-6.6C67 12 64.4 9 60.1 9c-2.1 0-3.8.8-4.6 1.7v-6h-3.9V22h3.9v-1.4Zm-.1-5c0-2 1.7-3.4 3.9-3.4 2 0 3.9 1.2 3.9 3.5 0 2.2-1.8 3.5-4 3.5-2.1 0-3.8-1.4-3.8-3.4v-.2ZM67.3 20a11 11 0 0 0 7.2 2.3c4 0 7-1.5 7-4.4 0-3-2.9-3.5-6.1-3.8-2.8-.4-3.6-.4-3.6-1.1 0-.7.9-1 2.5-1 2 0 3.7.5 4.8 1.6l2-2.3A9.7 9.7 0 0 0 74.5 9c-4 0-6.5 1.7-6.5 4.3 0 2.7 2.5 3.3 5.6 3.7 2.8.3 4 .3 4 1.2 0 .8-1 1.1-2.8 1.1-2.2 0-4.1-.7-5.7-2l-1.8 2.5ZM82.8 8h4V4.9h-4V8Zm3.9 1.4h-3.8V22h3.8V9.4Zm13.1 11.2V22h3.9V4.8h-3.9v6C99 9.8 97.4 9 95.2 9c-4.3 0-6.8 3-6.8 6.6 0 3.6 2.5 6.6 6.8 6.6 2.2 0 3.8-.8 4.6-1.7Zm.1-5v.2c0 2-1.7 3.4-3.9 3.4-2 0-3.9-1.3-3.9-3.5 0-2.3 1.8-3.5 4-3.5 2.1 0 3.8 1.4 3.8 3.4ZM106 8h4V4.9h-4V8Zm3.9 1.4H106V22h3.9V9.4Zm7 12.9a8 8 0 0 0 5.2-1.7c.6 1.2 2.2 2 5 1.4v-2.8c-1.4.3-1.7 0-1.7-.7v-4.6c0-3.2-2.3-4.8-6.4-4.8-3.5 0-6.2 1.5-7 3.8l3.4 1c.4-1 1.7-1.8 3.5-1.8 2 0 2.8.8 2.8 1.7v.1l-5 .5c-3 .3-5.2 1.5-5.2 4 0 2.4 2.2 3.9 5.4 3.9Zm4.8-5.1c0 1.4-2.2 2.3-4.1 2.3-1.5 0-2.4-.5-2.4-1.3s.7-1.1 2-1.3l4.5-.4v.7Zm6.7 4.8h3.8v-6c0-2.2 1.2-3.5 3.3-3.5 2 0 3 1.3 3 3.4V22h3.8v-7.2c0-3.5-2.2-5.7-5.5-5.7-2 0-3.6.8-4.6 1.8V9.4h-3.8V22Z"/>'

    return watermarkEl
  }
}