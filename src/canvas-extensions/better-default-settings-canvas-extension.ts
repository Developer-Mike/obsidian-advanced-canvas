import { Canvas, CanvasEdge, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"

export default class BetterDefaultSettingsCanvasExtension  extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.modifyCanvasSettings(this.plugin.getCurrentCanvas())

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => this.modifyCanvasSettings(this.plugin.getCurrentCanvas())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.modifyCanvasSettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:double-click',
      (canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) => this.onDoubleClick(canvas, event, preventDefault)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-created',
      (canvas: Canvas, node: CanvasNode) => {
        this.enforceNodeGridAlignment(canvas, node)
        this.applyDefaultNodeStyles(canvas, node)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-created',
      (canvas: Canvas, edge: CanvasEdge) => this.applyDefaultEdgeStyles(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas, node: CanvasNode) => this.enforceMaxNodeWidth(canvas, node)
    ))
  }

  private modifyCanvasSettings(canvas: Canvas | null) {
    if (!canvas) return

    const defaultTextNodeDimensionsArray = this.plugin.settings.getSetting('defaultTextNodeDimensions')
    canvas.config.defaultTextNodeDimensions = {
      width: defaultTextNodeDimensionsArray[0],
      height: defaultTextNodeDimensionsArray[1]
    }

    const defaultFileNodeDimensionsArray = this.plugin.settings.getSetting('defaultFileNodeDimensions')
    canvas.config.defaultFileNodeDimensions = {
      width: defaultFileNodeDimensionsArray[0],
      height: defaultFileNodeDimensionsArray[1]
    }

    canvas.config.minContainerDimension = this.plugin.settings.getSetting('minNodeSize')
  }

  private async onDoubleClick(canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) {
    if (event.defaultPrevented || event.target !== canvas.wrapperEl || canvas.isDragging || canvas.readonly) return
    preventDefault.value = true

    let pos = canvas.posFromEvt(event)

    switch (this.plugin.settings.getSetting('nodeTypeOnDoubleClick')) {
      case 'file':
        const file = await new FileSelectModal(this.plugin.app, undefined, true).awaitInput()
        canvas.createFileNode({
          pos: pos,
          position: 'center',
          file: file
        })

        break
      default:
        canvas.createTextNode({
          pos: pos,
          position: 'center'
        })

        break
    }
  }

  private enforceNodeGridAlignment(_canvas: Canvas, node: CanvasNode) {
    if (!this.plugin.settings.getSetting('alignNewNodesToGrid')) return

    const nodeData = node.getData()
    node.setData({
      ...nodeData,
      x: CanvasHelper.alignToGrid(nodeData.x),
      y: CanvasHelper.alignToGrid(nodeData.y)
    })
  }

  private applyDefaultNodeStyles(_canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type !== 'text') return

    node.setData({
      ...nodeData,
      styleAttributes: {
        ...nodeData.styleAttributes,
        ...this.plugin.settings.getSetting('defaultTextNodeStyleAttributes')
      }
    })
  }

  private async applyDefaultEdgeStyles(canvas: Canvas, edge: CanvasEdge) {
    const edgeData = edge.getData()

    edge.setData({
      ...edgeData,
      styleAttributes: {
        ...edgeData.styleAttributes,
        ...this.plugin.settings.getSetting('defaultEdgeStyleAttributes')
      }
    })

    // Wait until the connecting class is removed (else, the direction will be reset on mousemove (onConnectionPointerdown))
    if (canvas.canvasEl.hasClass('is-connecting')) {
      await new Promise<void>(resolve => {
        new MutationObserver(() => {
          if (!canvas.canvasEl.hasClass('is-connecting')) resolve()
        }).observe(canvas.canvasEl, { attributes: true, attributeFilter: ['class'] })
      })
    }

    const lineDirection = this.plugin.settings.getSetting('defaultEdgeLineDirection')
    edge.setData({
      ...edge.getData(),
      fromEnd: lineDirection === 'bidirectional' ? 'arrow' : 'none',
      toEnd: lineDirection === 'nondirectional' ? 'none' : 'arrow',
    })
  }

  private enforceMaxNodeWidth(_canvas: Canvas, node: CanvasNode) {
    const maxNodeWidth = this.plugin.settings.getSetting('maxNodeWidth')
    if (maxNodeWidth <= 0) return

    const nodeData = node.getData()
    if (nodeData.type !== 'text' && nodeData.type !== 'file' || (nodeData as CanvasFileNodeData).portal) return

    if (nodeData.width <= maxNodeWidth) return

    node.setData({
      ...nodeData,
      x: node.prevX !== undefined ? node.prevX : nodeData.x, // Reset the position to the previous value
      width: maxNodeWidth
    })
  }
}