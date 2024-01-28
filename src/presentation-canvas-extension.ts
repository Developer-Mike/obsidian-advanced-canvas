import { ItemView } from "obsidian"
import CanvasExtension from "./canvas-extension"

const SLIDE_NODE = {
  defaultSize: { width: 1600, height: 900 },
}

export default class PresentationCanvasExtension extends CanvasExtension {
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

    this.canvas.createGroupNode({
      pos: this.getCenterCoordinates(SLIDE_NODE.defaultSize),
      size: SLIDE_NODE.defaultSize,
      label: this.getSlideName(slideNumber),
      save: true,
      focus: false,
    })
  }

  private async startPresentation() {
    const slides = this.getSlides()
    const slideIndex = 0

    this.canvas.wrapperEl.requestFullscreen()
    this.canvas.wrapperEl.onfullscreenchange = (e: any) => {
      if (!document.fullscreenElement) {
        this.canvas.wrapperEl.onfullscreenchange = null
        console.log('Exited presentation mode')
        // Exit presentation mode
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
    this.canvas.zoomToBbox(slides[slideIndex].bbox)
  }
}