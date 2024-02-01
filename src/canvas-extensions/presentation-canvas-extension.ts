import { scaleBBox } from 'src/utils/bbox-helper'
import CanvasExtension from './canvas-extension'
import delay from 'src/utils/delay-helper'
import { Notice } from 'obsidian'
import { CanvasEdge, CanvasNode } from 'src/types/Canvas'

const START_SLIDE_NAME = 'Start Node'
const DEFAULT_SLIDE_NAME = 'New Node'

export default class PresentationCanvasExtension extends CanvasExtension {
  savedViewport: any = null
  isPresentationMode: boolean = false
  visitedNodes: any[] = []

  constructor(plugin: any) {
    super(plugin)

    this.plugin.addCommand({
			id: 'create-new-node',
			name: 'Create new node',
			checkCallback: this.canvasCommand(() => this.addNode())
    })

    this.plugin.addCommand({
			id: 'start-presentation',
      name: 'Start presentation',
      checkCallback: this.canvasCommand(() => this.startPresentation())
    })

    this.plugin.addCommand({
      id: 'previous-node',
      name: 'Previous node',
      checkCallback: (checking: boolean) => {
        if (checking) return this.canvas && this.isPresentationMode

        this.previousNode()
        return true
      }
    })

    this.plugin.addCommand({
			id: 'next-node',
      name: 'Next node',
      checkCallback: (checking: boolean) => {
        if (checking) return this.canvas && this.isPresentationMode

        this.nextNode()
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
        () => this.addNode()
      )
    )
  }

  onPopupMenuCreated(): void {
    this.addPopupMenuOption(
      this.createPopupMenuOption(
        'start-node', 
        'Set as start slide', 
        'play', 
        () => this.setStartNode([...this.canvas.selection].first())
      )
    )
  }

  onNodeChanged(node: CanvasNode): void {
    if (node.unknownData.isStartNode) 
      node.nodeEl.classList.add('start-node')
    else node.nodeEl.classList.remove('start-node')
  }
  
  private getStartNode(): CanvasNode|undefined {
    for (const [_, node] of this.canvas.nodes) {
      if (node.unknownData.isStartNode) return node
    }

    return undefined
  }

  private setStartNode(node: CanvasNode|undefined) {
    if (!node) return

    const startNode = this.getStartNode()
    if (startNode) this.setNodeUnknownData(startNode, 'isStartNode', false)

    this.setNodeUnknownData(node, 'isStartNode', true)
  }

  private addNode() {
    const isStartNode = this.getStartNode() == null
    const nodeSizeString = this.plugin.settingsManager.settings.defaultSlideSize
    const nodeSizeArray = nodeSizeString.split('x').map((value: string) => parseInt(value))
    const nodeSize = { width: nodeSizeArray[0], height: nodeSizeArray[1] }

    const groupNode = this.canvas.createGroupNode({
      pos: this.getCenterCoordinates(nodeSize),
      size: nodeSize,
      label: isStartNode ? START_SLIDE_NAME : DEFAULT_SLIDE_NAME,
      save: true,
      focus: false,
    })

    if (isStartNode) this.setNodeUnknownData(groupNode, 'isStartNode', true)
  }

  private async animateNodeTransition(fromNode: CanvasNode|undefined, toNode: CanvasNode) {
    const useCustomZoomFunction = this.plugin.settingsManager.settings.zoomToSlideWithoutPadding
    const animationDurationMs = this.plugin.settingsManager.settings.slideTransitionAnimationDuration * 1000
    
    if (animationDurationMs > 0 && fromNode) {
      const animationIntensity = this.plugin.settingsManager.settings.slideTransitionAnimationIntensity

      const currentNodeBBoxEnlarged = scaleBBox(fromNode.bbox, animationIntensity)
      if (useCustomZoomFunction) this.zoomToBBox(currentNodeBBoxEnlarged)
      else this.canvas.zoomToBbox(currentNodeBBoxEnlarged)

      await delay(animationDurationMs / 2)

      const nextNodeBBoxEnlarged = scaleBBox(toNode.bbox, animationIntensity)
      if (useCustomZoomFunction) this.zoomToBBox(nextNodeBBoxEnlarged)
      else this.canvas.zoomToBbox(nextNodeBBoxEnlarged)

      await delay(animationDurationMs / 2)
    }

    let nodeBBox = toNode.bbox
    if (useCustomZoomFunction) this.zoomToBBox(nodeBBox)
    else this.canvas.zoomToBbox(nodeBBox)
  }

  private async startPresentation() {
    const startNode = this.getStartNode()
    if (!startNode) {
      new Notice('No start node found. Please mark a node as a start node trough the popup menu.')
      return
    }

    this.visitedNodes = []
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
        if (e.key === 'ArrowRight') this.nextNode()
        else if (e.key === 'ArrowLeft') this.previousNode()
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

    // Zoom to first node
    this.visitedNodes.push(startNode)
    this.animateNodeTransition(undefined, startNode)
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

  private nextNode() {
    const fromNode = this.visitedNodes.last()
    if (!fromNode) return

    const outgoingEdges = this.canvas.getEdgesForNode(fromNode).filter((edge: CanvasEdge) => edge.from.node === fromNode)
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
      this.animateNodeTransition(fromNode, toNode)
    } else {
      // No more nodes left, animate to same node
      this.animateNodeTransition(fromNode, fromNode)
    }
  }

  private previousNode() {
    const fromNode = this.visitedNodes.pop()
    if (!fromNode) return

    let toNode = this.visitedNodes.last()

    // Fall back to same node if there are no more nodes before
    if (!toNode) {
      toNode = fromNode
      this.visitedNodes.push(fromNode)
    }

    this.animateNodeTransition(fromNode, toNode)
  }
}