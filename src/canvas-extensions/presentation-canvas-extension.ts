import { Menu, Notice } from 'obsidian'
import { BBox, Canvas, CanvasEdge, CanvasElement, CanvasNode, Position, Size } from 'src/@types/Canvas'
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from './canvas-extension'

const START_SLIDE_NAME = 'Start Slide'
const DEFAULT_SLIDE_NAME = 'New Slide'

export default class PresentationCanvasExtension extends CanvasExtension {
  savedViewport: any = null
  isPresentationMode: boolean = false
  visitedNodeIds: string[] = []
  fullscreenModalObserver: MutationObserver | null = null

  isEnabled() { return 'presentationFeatureEnabled' as const }
  
  init() {
    /* Add wrap in slide option to context menu */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:selection-menu',
      (menu: Menu, canvas: Canvas) => {
        menu.addItem((item) =>
          item
            .setTitle('Wrap in slide')
            .setIcon('gallery-vertical')
            .onClick(() => this.addSlide(canvas, undefined, 
              BBoxHelper.enlargeBBox(BBoxHelper.combineBBoxes(
                [...canvas.selection.values()].map((element: CanvasElement) => element.getBBox())
              ), this.plugin.settings.getSetting('wrapInSlidePadding'))
            ))
        )
      }
    ))

    this.plugin.addCommand({
			id: 'create-new-slide',
			name: 'Create new slide',
			checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && !this.isPresentationMode,
        (canvas: Canvas) => this.addSlide(canvas)
      )
    })

    this.plugin.addCommand({
			id: 'set-start-node',
			name: 'Set start node',
			checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && !this.isPresentationMode && canvas.getSelectionData().nodes.length === 1,
        (canvas: Canvas) => this.setStartNode(canvas, canvas.nodes.get(canvas.getSelectionData().nodes[0].id))
      )
    })

    this.plugin.addCommand({
			id: 'start-presentation',
      name: 'Start presentation',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => !this.isPresentationMode,
        (canvas: Canvas) => this.startPresentation(canvas)
      )
    })

    this.plugin.addCommand({
			id: 'continue-presentation',
      name: 'Continue presentation',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => !this.isPresentationMode,
        (canvas: Canvas) => this.startPresentation(canvas, true)
      )
    })

    this.plugin.addCommand({
      id: 'end-presentation',
      name: 'End presentation',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => this.isPresentationMode,
        (canvas: Canvas) => this.endPresentation(canvas)
      )
    })

    this.plugin.addCommand({
      id: 'previous-node',
      name: 'Previous node',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => this.isPresentationMode,
        (canvas: Canvas) => this.previousNode(canvas)
      )
    })

    this.plugin.addCommand({
			id: 'next-node',
      name: 'Next node',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => this.isPresentationMode,
        (canvas: Canvas) => this.nextNode(canvas)
      )
    })

    // Register events
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  onCanvasChanged(canvas: Canvas): void {
    CanvasHelper.addCardMenuOption(
      canvas,
      CanvasHelper.createCardMenuOption(
        canvas,
        {
          id: 'new-slide',
          label: 'Drag to add slide',
          icon: 'gallery-vertical'
        },
        () => this.getDefaultSlideSize(),
        (canvas: Canvas, pos: Position) => this.addSlide(canvas, pos)
      )
    )
  }

  onPopupMenuCreated(canvas: Canvas): void {
    if (!this.plugin.settings.getSetting('showSetStartNodeInPopup')) return

    // If the canvas is readonly or there are multiple/no nodes selected, return
    const selectedNodesData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectedNodesData.length !== 1 || canvas.selection.size > 1) return
    
    const selectedNode = canvas.nodes.get(selectedNodesData[0].id)
    if (!selectedNode) return
    
    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'start-node', 
        label: 'Set as start slide', 
        icon: 'play', 
        callback: () => this.setStartNode(canvas, selectedNode)
      })
    )
  }

  private setStartNode(canvas: Canvas, node: CanvasNode | undefined) {
    if (!node) return
    canvas.metadata['startNode'] = node.getData().id
  }

  private getDefaultSlideSize(): Size {
    const slideSize = this.plugin.settings.getSetting('defaultSlideDimensions')
    return { width: slideSize[0], height: slideSize[1] }
  }

  private getSlideAspectRatio(): number {
    const slideSize = this.getDefaultSlideSize()
    return slideSize.width / slideSize.height
  }

  private addSlide(canvas: Canvas, pos?: Position, bbox?: BBox) {
    const isStartNode = canvas.metadata['startNode'] === undefined
    const slideSize = this.getDefaultSlideSize()
    const slideAspectRatio = this.getSlideAspectRatio()

    if (bbox) {
      const bboxWidth = bbox.maxX - bbox.minX
      const bboxHeight = bbox.maxY - bbox.minY

      // Make sure the nodes fit inside the bounding box while keeping the aspect ratio
      if (bboxWidth / bboxHeight > slideAspectRatio) {
        slideSize.width = bboxWidth
        slideSize.height = bboxWidth / slideAspectRatio
      } else {
        slideSize.height = bboxHeight
        slideSize.width = bboxHeight * slideAspectRatio
      }
      
      pos = { 
        x: bbox.minX,
        y: bbox.minY
      }
    }

    // If no position is provided, use the center of the canvas
    if (!pos) pos = CanvasHelper.getCenterCoordinates(canvas, this.getDefaultSlideSize())

    const groupNode = canvas.createGroupNode({
      pos: pos,
      size: slideSize,
      label: isStartNode ? START_SLIDE_NAME : DEFAULT_SLIDE_NAME,
      focus: false,
    })

    groupNode.setData({ 
      ...groupNode.getData(), 
      ratio: slideAspectRatio
    })

    if (isStartNode) canvas.metadata['startNode'] = groupNode.getData().id
  }

  private async animateNodeTransition(canvas: Canvas, fromNode: CanvasNode|undefined, toNode: CanvasNode) {
    const useCustomZoomFunction = this.plugin.settings.getSetting('zoomToSlideWithoutPadding')
    const animationDurationMs = this.plugin.settings.getSetting('slideTransitionAnimationDuration') * 1000

    const toNodeBBox = CanvasHelper.getSmallestAllowedZoomBBox(canvas, toNode.getBBox())
    
    if (animationDurationMs > 0 && fromNode) {
      const animationIntensity = this.plugin.settings.getSetting('slideTransitionAnimationIntensity')

      const fromNodeBBox = CanvasHelper.getSmallestAllowedZoomBBox(canvas, fromNode.getBBox())

      const currentNodeBBoxEnlarged = BBoxHelper.scaleBBox(fromNodeBBox, animationIntensity)
      if (useCustomZoomFunction) canvas.zoomToRealBbox(currentNodeBBoxEnlarged)
      else canvas.zoomToBbox(currentNodeBBoxEnlarged)

      await sleep(animationDurationMs / 2)

      if (fromNode.getData().id !== toNode.getData().id) {
        // Add 0.1 to fix obsidian bug that causes the animation to skip if the bbox is the same
        const nextNodeBBoxEnlarged = BBoxHelper.scaleBBox(toNodeBBox, animationIntensity + 0.1)
        if (useCustomZoomFunction) canvas.zoomToRealBbox(nextNodeBBoxEnlarged)
        else canvas.zoomToBbox(nextNodeBBoxEnlarged)

        await sleep(animationDurationMs / 2)
      }
    }

    if (useCustomZoomFunction) canvas.zoomToRealBbox(toNodeBBox)
    else canvas.zoomToBbox(toNodeBBox)
  }

  private async startPresentation(canvas: Canvas, tryContinue: boolean = false) {
    // Only reset visited nodes if we are not trying to continue
    if (!tryContinue || this.visitedNodeIds.length === 0) {
      const startNode = canvas.metadata['startNode'] && canvas.nodes.get(canvas.metadata['startNode'])
      if (!startNode) {
        new Notice('No start node found. Please mark a node as a start node trough the popup menu.')
        return
      }
      
      this.visitedNodeIds = [startNode.getData().id]
    }

    // Save current viewport
    this.savedViewport = {
      x: canvas.tx,
      y: canvas.ty,
      zoom: canvas.tZoom,
    }

    // Enter fullscreen mode
    canvas.wrapperEl.focus()
    canvas.wrapperEl.requestFullscreen()
    canvas.wrapperEl.classList.add('presentation-mode')

    // Lock canvas
    canvas.setReadonly(true)

    // Disable zoom clamping
    if (this.plugin.settings.getSetting('useUnclampedZoomWhilePresenting'))
      canvas.screenshotting = true

    // Register event handler for keyboard navigation
    canvas.wrapperEl.onkeydown = (e: any) => {
      if (this.plugin.settings.getSetting('useArrowKeysToChangeSlides')) {
        if (e.key === 'ArrowRight') this.nextNode(canvas)
        else if (e.key === 'ArrowLeft') this.previousNode(canvas)
      }

      if (this.plugin.settings.getSetting('usePgUpPgDownKeysToChangeSlides')) {
        if (e.key === 'PageDown') this.nextNode(canvas)
        else if (e.key === 'PageUp') this.previousNode(canvas)
      }
    }

    // Keep modals while in fullscreen mode
    this.fullscreenModalObserver = new MutationObserver((mutationRecords) => {
      mutationRecords.forEach((mutationRecord) => {
        mutationRecord.addedNodes.forEach((node) => {
          document.body.removeChild(node)
          document.fullscreenElement?.appendChild(node)
        })
      })

      const inputField = document.querySelector(".prompt-input") as HTMLInputElement|null
      if (inputField) inputField.focus()
    })
    this.fullscreenModalObserver.observe(document.body, { childList: true })

    // Register event handler for exiting presentation mode
    canvas.wrapperEl.onfullscreenchange = (_e: any) => {
      if (document.fullscreenElement) return
      this.endPresentation(canvas)
    }

    this.isPresentationMode = true

    // Wait for fullscreen to be enabled
    await sleep(500)

    // Zoom to first node
    const startNodeId = this.visitedNodeIds.first()
    if (!startNodeId) return

    const startNode = canvas.nodes.get(startNodeId)
    if (!startNode) return

    this.animateNodeTransition(canvas, undefined, startNode)
  }

  private endPresentation(canvas: Canvas) {
    // Unregister event handlers
    this.fullscreenModalObserver?.disconnect()
    this.fullscreenModalObserver = null
    canvas.wrapperEl.onkeydown = null
    canvas.wrapperEl.onfullscreenchange = null

    // Unlock canvas
    canvas.setReadonly(false)
    
    // Re-enable zoom clamping
    if (this.plugin.settings.getSetting('useUnclampedZoomWhilePresenting'))
      canvas.screenshotting = false

    // Exit fullscreen mode
    canvas.wrapperEl.classList.remove('presentation-mode')
    if (document.fullscreenElement) document.exitFullscreen()

    // Reset viewport
    if (this.plugin.settings.getSetting('resetViewportOnPresentationEnd'))
      canvas.setViewport(this.savedViewport.x, this.savedViewport.y, this.savedViewport.zoom)
    
    this.isPresentationMode = false
  }

  private nextNode(canvas: Canvas) {
    const fromNodeId = this.visitedNodeIds.last()
    if (!fromNodeId) return

    const fromNode = canvas.nodes.get(fromNodeId)
    if (!fromNode) return

    const outgoingEdges = canvas.getEdgesForNode(fromNode).filter((edge: CanvasEdge) => edge.from.node.getData().id === fromNodeId)
    let toNode = outgoingEdges.first()?.to.node

    // If there are multiple outgoing edges, we need to look at the edge label
    if (outgoingEdges.length > 1) {
      // Create map of edge labels to nodes
      const sortedEdges = outgoingEdges
        .sort((a: CanvasEdge, b: CanvasEdge) => {
          if (!a.label) return 1
          if (!b.label) return -1

          return a.label.localeCompare(b.label)
        })

      // Find which edges already have been traversed
      const traversedEdgesCount = this.visitedNodeIds
        .filter((visitedNodeId: string) => visitedNodeId === fromNodeId).length - 1

      // Select next edge
      const nextEdge = sortedEdges[traversedEdgesCount]
      toNode = nextEdge.to.node
    }

    if (toNode) {
      this.visitedNodeIds.push(toNode.getData().id)
      this.animateNodeTransition(canvas, fromNode, toNode)
    } else {
      // No more nodes left, animate to same node
      this.animateNodeTransition(canvas, fromNode, fromNode)
    }
  }

  private previousNode(canvas: Canvas) {
    const fromNodeId = this.visitedNodeIds.pop()
    if (!fromNodeId) return

    const fromNode = canvas.nodes.get(fromNodeId)
    if (!fromNode) return

    const toNodeId = this.visitedNodeIds.last()
    let toNode = toNodeId ? canvas.nodes.get(toNodeId) : null

    // Fall back to same node if there are no more nodes before
    if (!toNode) {
      toNode = fromNode
      this.visitedNodeIds.push(fromNodeId)
    }

    this.animateNodeTransition(canvas, fromNode, toNode)
  }
}