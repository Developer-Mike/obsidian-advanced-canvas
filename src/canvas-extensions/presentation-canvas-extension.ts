import { scaleBBox } from "src/utils/bbox-helper"
import CanvasExtension from "./canvas-extension"
import delay from "src/utils/delay-helper"
import { Notice } from "obsidian"

const START_SLIDE_NAME = 'Start'
const DEFAULT_SLIDE_NAME = 'New Slide'

export default class PresentationCanvasExtension extends CanvasExtension {
  savedViewport: any = null
  isPresentationMode: boolean = false
  visitedSlides: any[] = []

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

  onCardMenuCreated(): void {
    this.addCardMenuOption(
      this.createCardMenuOption(
        'new-slide', 
        'Create new slide', 
        'gallery-vertical', 
        () => this.addSlide()
      )
    )
  }

  onPopupMenuCreated(): void {}
  onNodeChanged(_node: any): void {}

  private addSlide() {
    const slideSizeString = this.plugin.settingsManager.settings.defaultSlideSize
    const slideSizeArray = slideSizeString.split('x').map((value: string) => parseInt(value))
    const slideSize = { width: slideSizeArray[0], height: slideSizeArray[1] }

    this.canvas.createGroupNode({
      pos: this.getCenterCoordinates(slideSize),
      size: slideSize,
      label: DEFAULT_SLIDE_NAME,
      save: true,
      focus: false,
    })
  }

  private async animateSlideTransition(fromSlide: any, toSlide: any) {
    const useCustomZoomFunction = this.plugin.settingsManager.settings.zoomToSlideWithoutPadding
    const animationDurationMs = this.plugin.settingsManager.settings.slideTransitionAnimationDuration * 1000
    
    if (animationDurationMs > 0 && fromSlide) {
      const animationIntensity = this.plugin.settingsManager.settings.slideTransitionAnimationIntensity

      const currentSlideBBoxEnlarged = scaleBBox(fromSlide.bbox, animationIntensity)
      if (useCustomZoomFunction) this.zoomToBBox(currentSlideBBoxEnlarged)
      else this.canvas.zoomToBbox(currentSlideBBoxEnlarged)

      await delay(animationDurationMs / 2)

      const nextSlideBBoxEnlarged = scaleBBox(toSlide.bbox, animationIntensity)
      if (useCustomZoomFunction) this.zoomToBBox(nextSlideBBoxEnlarged)
      else this.canvas.zoomToBbox(nextSlideBBoxEnlarged)

      await delay(animationDurationMs / 2)
    }

    let nodeBBox = toSlide.bbox
    if (useCustomZoomFunction) this.zoomToBBox(nodeBBox)
    else this.canvas.zoomToBbox(nodeBBox)
  }

  private async startPresentation() {
    const startSlide = this.getStartSlide()
    if (!startSlide) {
      new Notice('No start slide found. Please create a group node with the label "Start".')
      return
    }

    this.visitedSlides = []
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
    this.visitedSlides.push(startSlide)
    this.animateSlideTransition(null, startSlide)
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

  private getStartSlide(): any {
    for (const [_, node] of this.canvas.nodes) {
      const nodeData = node.getData()
      if (nodeData.type !== 'group') continue
      if (nodeData.label === START_SLIDE_NAME) return node
    }

    return null
  }

  private nextSlide() {
    const fromSlide = this.visitedSlides.last()
    if (!fromSlide) return

    const outgoingEdges = this.canvas.getEdgesForNode(fromSlide).filter((edge: any) => edge.from.node === fromSlide)
    let toSlide = outgoingEdges.first()?.to.node

    // If there are multiple outgoing edges, we need to look at the edge label
    if (outgoingEdges.length > 1) {
      // Create map of edge labels to nodes
      const edgeLabeled = outgoingEdges
        .map((edge: any) => ({ label: edge.label, node: edge.to.node }))
        // Sort by label
        .sort((a: any, b: any) => {
          if (!a.label) return 1
          if (!b.label) return -1

          return a.label.localeCompare(b.label)
        })

      // Find which edges already have been traversed
      const traversedEdgesCount = this.visitedSlides.filter((visitedSlide: any) => visitedSlide == fromSlide).length - 1

      // Select next edge
      const nextEdge = edgeLabeled[traversedEdgesCount]
      toSlide = nextEdge.node
    }

    if (toSlide) {
      this.visitedSlides.push(toSlide)
      this.animateSlideTransition(fromSlide, toSlide)
    } else {
      // No more slides left, animate to same slide
      this.animateSlideTransition(fromSlide, fromSlide)
    }
  }

  private previousSlide() {
    const fromSlide = this.visitedSlides.pop()
    if (!fromSlide) return

    let toSlide = this.visitedSlides.last()

    // Fall back to same slide if there are no more slides before
    if (!toSlide) {
      toSlide = fromSlide
      this.visitedSlides.push(fromSlide)
    }

    this.animateSlideTransition(fromSlide, toSlide)
  }
}