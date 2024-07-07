import { Menu, Notice } from 'obsidian'
import { BBox, Canvas, CanvasEdge, CanvasElement, CanvasNode, Position, Size } from 'src/@types/Canvas'
import { CanvasEvent } from 'src/core/events'
import CanvasHelper from "src/utils/canvas-helper"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasExtension from '../core/canvas-extension'

const START_SLIDE_NAME = 'Start Slide'
const DEFAULT_SLIDE_NAME = 'New Slide'

export default class PresentationCanvasExtension extends CanvasExtension {
  savedViewport: any = null
  isPresentationMode: boolean = false
  visitedNodes: any[] = []
  fullscreenModalObserver: MutationObserver | null = null

  isEnabled() { return 'presentationFeatureEnabled' as const }
  
  init() {
    /* Add wrap in slide option to context menu */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.SelectionContextMenu,
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
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeMoved,
      (canvas: Canvas, node: CanvasNode) => this.onNodeMoved(canvas, node)
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

  private onNodeMoved(_canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (!nodeData.sideRatio) return

    const nodeBBox = node.getBBox()
    const nodeSize = {
      width: nodeBBox.maxX - nodeBBox.minX,
      height: nodeBBox.maxY - nodeBBox.minY
    }
    const nodeAspectRatio = nodeSize.width / nodeSize.height

    if (nodeAspectRatio < nodeData.sideRatio)
      nodeSize.width = nodeSize.height * nodeData.sideRatio
    else nodeSize.height = nodeSize.width / nodeData.sideRatio

    node.setData({
      ...nodeData,
      width: nodeSize.width,
      height: nodeSize.height
    })
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
    if (startNode) startNode.setData({ ...startNode.getData(), isStartNode: false })

    if (node !== startNode) node.setData({ ...node.getData(), isStartNode: true }, true)
  }

  private getDefaultSlideSize(): Size {
    const slideSizeString = this.plugin.settings.getSetting('defaultSlideSize')
    const slideSizeArray = slideSizeString.split('x').map((value: string) => parseInt(value))
    return { width: slideSizeArray[0], height: slideSizeArray[1] }
  }

  private getSlideAspectRatio(): number {
    const slideSize = this.getDefaultSlideSize()
    return slideSize.width / slideSize.height
  }

  private addSlide(canvas: Canvas, pos?: Position, bbox?: BBox) {
    const isStartNode = this.getStartNode(canvas) == null
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
      sideRatio: slideAspectRatio,
      isStartNode: isStartNode ? true : undefined,
    })
  }

  private async animateNodeTransition(canvas: Canvas, fromNode: CanvasNode|undefined, toNode: CanvasNode) {
    const useCustomZoomFunction = this.plugin.settings.getSetting('zoomToSlideWithoutPadding')
    const animationDurationMs = this.plugin.settings.getSetting('slideTransitionAnimationDuration') * 1000
    
    if (animationDurationMs > 0 && fromNode) {
      const animationIntensity = this.plugin.settings.getSetting('slideTransitionAnimationIntensity')

      const currentNodeBBoxEnlarged = BBoxHelper.scaleBBox(fromNode.getBBox(), animationIntensity)
      if (useCustomZoomFunction) CanvasHelper.zoomToBBox(canvas, currentNodeBBoxEnlarged)
      else canvas.zoomToBbox(currentNodeBBoxEnlarged)

      await sleep(animationDurationMs / 2)

      const nextNodeBBoxEnlarged = BBoxHelper.scaleBBox(toNode.getBBox(), animationIntensity)
      if (useCustomZoomFunction) CanvasHelper.zoomToBBox(canvas, nextNodeBBoxEnlarged)
      else canvas.zoomToBbox(nextNodeBBoxEnlarged)

      await sleep(animationDurationMs / 2)
    }

    let nodeBBox = toNode.getBBox()
    if (useCustomZoomFunction) CanvasHelper.zoomToBBox(canvas, nodeBBox)
    else canvas.zoomToBbox(nodeBBox)
  }

  private async startPresentation(canvas: Canvas, tryContinue: boolean = false) {
    // Only reset visited nodes if we are not trying to continue
    if (!tryContinue || this.visitedNodes.length === 0) {
      const startNode = this.getStartNode(canvas)
      if (!startNode) {
        new Notice('No start node found. Please mark a node as a start node trough the popup menu.')
        return
      }
      
      this.visitedNodes = [startNode]
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
    this.animateNodeTransition(canvas, undefined, this.visitedNodes.last())
  }

  private endPresentation(canvas: Canvas) {
    // Unregister event handlers
    this.fullscreenModalObserver?.disconnect()
    this.fullscreenModalObserver = null
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