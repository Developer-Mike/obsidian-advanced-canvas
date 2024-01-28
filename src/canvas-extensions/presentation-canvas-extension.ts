import { scaleBBox } from "src/utils/bbox-helper"
import CanvasExtension from "./canvas-extension"
import delay from "src/utils/delay-helper"

export default class PresentationCanvasExtension extends CanvasExtension {
  savedViewport: any = null
  isPresentationMode: boolean = false
  slides: any[] = []
  currentSlideIndex: number = 0

  constructor(plugin: any) {
    super(plugin)

    this.plugin.addCommand({
			id: 'create-new-slide',
			name: 'Create new slide',
			checkCallback: this.canvasCommand(() => this.addSlide())
    })

    this.plugin.addCommand({
			id: 'start-presentation',
      name: 'Start presentation',
      checkCallback: this.canvasCommand(() => this.startPresentation())
    })

    this.plugin.addCommand({
      id: 'previous-slide',
      name: 'Previous slide',
      checkCallback: (checking: boolean) => {
        if (checking) return this.canvas && this.isPresentationMode

        this.previousSlide()
        return true
      }
    })

    this.plugin.addCommand({
			id: 'next-slide',
      name: 'Next slide',
      checkCallback: (checking: boolean) => {
        if (checking) return this.canvas && this.isPresentationMode

        this.nextSlide()
        return true
      }
    })
  }

  canvasCommand(callback: () => void): (checking: boolean) => boolean {
    return (checking: boolean) => {
      if (checking) return this.canvas != null

      callback()
      return true
    }
  }

  renderMenu(): void {
    this.addMenuOption(
      this.createMenuOption(
        'new-slide', 
        'Create new slide', 
        'gallery-vertical', 
        () => this.addSlide()
      )
    )
  }

  renderNode(_node: any): void {}

  private getSlideName(index: number): string {
    return `Slide ${index}`
  }

  private getStartSlide(): any {
    for (const [_, node] of this.canvas.nodes) {
      const nodeData = node.getData()
      if (nodeData.type !== 'group') continue
      if (nodeData.label === this.getSlideName(1)) return node
    }

    return null
  }

  private getNextSlide(currentSlide: any): any {
    const edge = this.canvas.getEdgesForNode(currentSlide).first()
    if (edge == null) return null

    return edge.to.node
  }

  private getSlides(): any[] {
    const slides: any[] = []

    const startSlide = this.getStartSlide()
    if (startSlide == null) return slides

    let currentSlide = startSlide
    while (currentSlide != null && !slides.contains(currentSlide)) {
      slides.push(currentSlide)
      currentSlide = this.getNextSlide(currentSlide)
    }

    return slides
  }

  private addSlide() {
    const slideNumber = this.getSlides().length + 1

    const slideSizeString = this.plugin.settingsManager.settings.defaultSlideSize
    const slideSizeArray = slideSizeString.split('x').map((value: string) => parseInt(value))
    const slideSize = { width: slideSizeArray[0], height: slideSizeArray[1] }

    this.canvas.createGroupNode({
      pos: this.getCenterCoordinates(slideSize),
      size: slideSize,
      label: this.getSlideName(slideNumber),
      save: true,
      focus: false,
    })
  }

  private async gotoSlide(slideIndex: number) {
    const useCustomZoomFunction = this.plugin.settingsManager.settings.zoomToSlideWithoutPadding
    const animationDurationMs = this.plugin.settingsManager.settings.slideTransitionAnimationDuration * 1000
    
    if (animationDurationMs > 0) {
      const animationIntensity = this.plugin.settingsManager.settings.slideTransitionAnimationIntensity

      const currentSlideBBoxEnlarged = scaleBBox(this.slides[this.currentSlideIndex].bbox, animationIntensity)
      if (useCustomZoomFunction) this.zoomToBBox(currentSlideBBoxEnlarged)
      else this.canvas.zoomToBbox(currentSlideBBoxEnlarged)

      await delay(animationDurationMs / 2)

      const nextSlideBBoxEnlarged = scaleBBox(this.slides[slideIndex].bbox, animationIntensity)
      if (useCustomZoomFunction) this.zoomToBBox(nextSlideBBoxEnlarged)
      else this.canvas.zoomToBbox(nextSlideBBoxEnlarged)

      await delay(animationDurationMs / 2)
    }

    let nodeBBox = this.slides[slideIndex].bbox
    if (useCustomZoomFunction) this.zoomToBBox(nodeBBox)
    else this.canvas.zoomToBbox(nodeBBox)
    
    this.currentSlideIndex = slideIndex
  }

  private async startPresentation() {
    this.slides = this.getSlides()
    this.savedViewport = {
      x: this.canvas.tx,
      y: this.canvas.ty,
      zoom: this.canvas.tZoom,
    }

    // Enter fullscreen mode
    this.canvas.wrapperEl.focus()
    this.canvas.wrapperEl.requestFullscreen()
    this.canvas.wrapperEl.classList.add('presentation-mode')

    // Lock canvas
    this.canvas.setReadonly(true)

    // Register event handler for keyboard navigation
    if (this.plugin.settingsManager.settings.useArrowKeysToChangeSlides) {
      this.canvas.wrapperEl.onkeydown = (e: any) => {
        if (e.key === 'ArrowRight') this.nextSlide()
        else if (e.key === 'ArrowLeft') this.previousSlide()
      }
    }

    // Register event handler for exiting presentation mode
    this.canvas.wrapperEl.onfullscreenchange = (_e: any) => {
      if (document.fullscreenElement) return
      this.endPresentation()
    }

    this.isPresentationMode = true

    // Wait for fullscreen to be enabled
    await delay(500)

    // Zoom to first slide
    this.gotoSlide(0)
  }

  private endPresentation() {
    // Unregister event handlers
    this.canvas.wrapperEl.onkeydown = null
    this.canvas.wrapperEl.onfullscreenchange = null

    // Unlock canvas
    this.canvas.setReadonly(false)

    // Exit fullscreen mode
    this.canvas.wrapperEl.classList.remove('presentation-mode')
    if (document.fullscreenElement) document.exitFullscreen()

    // Reset viewport
    this.canvas.setViewport(this.savedViewport.x, this.savedViewport.y, this.savedViewport.zoom)
    this.isPresentationMode = false
  }

  private nextSlide() {
    // Only go to next slide if there are any slides left
    let targetSlideIndex = Math.min(
      this.currentSlideIndex + 1, 
      this.slides.length - 1
    )

    this.gotoSlide(targetSlideIndex)
  }

  private previousSlide() {
    // Only go to previous slide if there are any slides left
    let targetSlideIndex = Math.max(
      0,
      this.currentSlideIndex - 1
    )

    this.gotoSlide(targetSlideIndex)
  }
}