import { Notice } from 'obsidian'
import { Canvas, CanvasEdge, CanvasNode, Position, Size } from 'src/@types/Canvas'
import AdvancedCanvasPlugin from 'src/main'
import { CanvasEvent } from 'src/events/events'
import * as CanvasHelper from "src/utils/canvas-helper"

const START_SLIDE_NAME = 'Start Slide'
const DEFAULT_SLIDE_NAME = 'New Slide'

export default class PresentationCanvasExtension {
  plugin: AdvancedCanvasPlugin
  savedViewport: any = null
  isPresentationMode: boolean = false
  visitedNodes: any[] = []

  constructor(plugin: any) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('presentationFeatureEnabled')) return

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
			id: 'start-presentation',
      name: 'Start presentation',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin, 
        (_canvas: Canvas) => !this.isPresentationMode,
        (canvas: Canvas) => this.startPresentation(canvas)
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
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  onCanvasChanged(canvas: Canvas): void {
    CanvasHelper.addCardMenuOption(
      canvas,
      CanvasHelper.createCardMenuOption(
        canvas,
        'new-slide',
        'Drag to add slide',
        'gallery-vertical',
        () => this.getSlideSize(),
        (canvas: Canvas, pos: Position) => this.addSlide(canvas, pos)
      )
    )
  }

  onPopupMenuCreated(canvas: Canvas): void {
    // If the canvas is readonly or there are multiple nodes selected, return
    if (canvas.readonly || canvas.selection.size > 1) return
    
    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption(
        'start-node', 
        'Set as start slide', 
        'play', 
        () => this.setStartNode(canvas, [...canvas.selection].first())
      )
    )
  }
  
  private getStartNode(canvas: Canvas): CanvasNode|undefined {
    for (const [_, node] of canvas.nodes) {
      if (node.getData().isStartNode) return node
    }

    return undefined
  }

  private setStartNode(canvas: Canvas, node: CanvasNode|undefined) {
    if (!node) return

    const startNode = this.getStartNode(canvas)
    if (startNode) canvas.setNodeData(startNode, 'isStartNode', false)

    if (node !== startNode) canvas.setNodeData(node, 'isStartNode', true)
  }

  private getSlideSize(): Size {
    const slideSizeString = this.plugin.settingsManager.getSetting('defaultSlideSize')
    const slideSizeArray = slideSizeString.split('x').map((value: string) => parseInt(value))
    return { width: slideSizeArray[0], height: slideSizeArray[1] }
  }

  private addSlide(canvas: Canvas, pos?: Position) {
    if (!pos) pos = CanvasHelper.getCenterCoordinates(canvas, this.getSlideSize())

    const isStartNode = this.getStartNode(canvas) == null
    const nodeSize = this.getSlideSize()

    const groupNode = canvas.createGroupNode({
      pos: pos,
      size: nodeSize,
      label: isStartNode ? START_SLIDE_NAME : DEFAULT_SLIDE_NAME,
      focus: false,
    })

    if (isStartNode) canvas.setNodeData(groupNode, 'isStartNode', true)
  }

  private async animateNodeTransition(canvas: Canvas, fromNode: CanvasNode|undefined, toNode: CanvasNode) {
    const useCustomZoomFunction = this.plugin.settingsManager.getSetting('zoomToSlideWithoutPadding')
    const animationDurationMs = this.plugin.settingsManager.getSetting('slideTransitionAnimationDuration') * 1000
    
    if (animationDurationMs > 0 && fromNode) {
      const animationIntensity = this.plugin.settingsManager.getSetting('slideTransitionAnimationIntensity')

      const currentNodeBBoxEnlarged = CanvasHelper.scaleBBox(fromNode.getBBox(), animationIntensity)
      if (useCustomZoomFunction) CanvasHelper.zoomToBBox(canvas, currentNodeBBoxEnlarged)
      else canvas.zoomToBbox(currentNodeBBoxEnlarged)

      await sleep(animationDurationMs / 2)

      const nextNodeBBoxEnlarged = CanvasHelper.scaleBBox(toNode.getBBox(), animationIntensity)
      if (useCustomZoomFunction) CanvasHelper.zoomToBBox(canvas, nextNodeBBoxEnlarged)
      else canvas.zoomToBbox(nextNodeBBoxEnlarged)

      await sleep(animationDurationMs / 2)
    }

    let nodeBBox = toNode.getBBox()
    if (useCustomZoomFunction) CanvasHelper.zoomToBBox(canvas, nodeBBox)
    else canvas.zoomToBbox(nodeBBox)
  }

  private async startPresentation(canvas: Canvas) {
    const startNode = this.getStartNode(canvas)
    if (!startNode) {
      new Notice('No start node found. Please mark a node as a start node trough the popup menu.')
      return
    }

    this.visitedNodes = []
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

    // Register event handler for keyboard navigation
    if (this.plugin.settingsManager.getSetting('useArrowKeysToChangeSlides')) {
      canvas.wrapperEl.onkeydown = (e: any) => {
        if (e.key === 'ArrowRight') this.nextNode(canvas)
        else if (e.key === 'ArrowLeft') this.previousNode(canvas)
      }
    }

    // Keep modals while in fullscreen mode
    const fullscreenModalObserver = new MutationObserver((mutationRecords) => {
      mutationRecords.forEach((mutationRecord) => {
        mutationRecord.addedNodes.forEach((node) => {
          document.body.removeChild(node)
          document.fullscreenElement?.appendChild(node)
        })
      })

      const inputField = document.querySelector(".prompt-input") as HTMLInputElement|null
      if (inputField) inputField.focus()
    })
    fullscreenModalObserver.observe(document.body, { childList: true })

    // Register event handler for exiting presentation mode
    canvas.wrapperEl.onfullscreenchange = (_e: any) => {
      if (document.fullscreenElement) return

      fullscreenModalObserver.disconnect()
      this.endPresentation(canvas)
    }

    this.isPresentationMode = true

    // Wait for fullscreen to be enabled
    await sleep(500)

    // Zoom to first node
    this.visitedNodes.push(startNode)
    this.animateNodeTransition(canvas, undefined, startNode)
  }

  private endPresentation(canvas: Canvas) {
    // Unregister event handlers
    canvas.wrapperEl.onkeydown = null
    canvas.wrapperEl.onfullscreenchange = null

    // Unlock canvas
    canvas.setReadonly(false)

    // Exit fullscreen mode
    canvas.wrapperEl.classList.remove('presentation-mode')
    if (document.fullscreenElement) document.exitFullscreen()

    // Reset viewport
    canvas.setViewport(this.savedViewport.x, this.savedViewport.y, this.savedViewport.zoom)
    this.isPresentationMode = false
  }

  private nextNode(canvas: Canvas) {
    const fromNode = this.visitedNodes.last()
    if (!fromNode) return

    const outgoingEdges = canvas.getEdgesForNode(fromNode).filter((edge: CanvasEdge) => edge.from.node === fromNode)
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
      const traversedEdgesCount = this.visitedNodes
        .filter((visitedNode: CanvasNode) => visitedNode == fromNode).length - 1

      // Select next edge
      const nextEdge = sortedEdges[traversedEdgesCount]
      toNode = nextEdge.to.node
    }

    if (toNode) {
      this.visitedNodes.push(toNode)
      this.animateNodeTransition(canvas, fromNode, toNode)
    } else {
      // No more nodes left, animate to same node
      this.animateNodeTransition(canvas, fromNode, fromNode)
    }
  }

  private previousNode(canvas: Canvas) {
    const fromNode = this.visitedNodes.pop()
    if (!fromNode) return

    let toNode = this.visitedNodes.last()

    // Fall back to same node if there are no more nodes before
    if (!toNode) {
      toNode = fromNode
      this.visitedNodes.push(fromNode)
    }

    this.animateNodeTransition(canvas, fromNode, toNode)
  }
}