import { Canvas, CanvasEdge, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import SettingsManager from "src/settings"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "../core/canvas-extension"
import CanvasHelper from "src/utils/canvas-helper"

export default class BetterDefaultSettingsCanvasExtension  extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.modifyCanvasSettings(this.plugin.getCurrentCanvas())

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      SettingsManager.SETTINGS_CHANGED_EVENT,
      () => this.modifyCanvasSettings(this.plugin.getCurrentCanvas())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.modifyCanvasSettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DoubleClick,
      (canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) => this.onDoubleClick(canvas, event, preventDefault)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeCreated,
      (canvas: Canvas, node: CanvasNode) => this.applyDefaultNodeStyles(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeCreated,
      (canvas: Canvas, edge: CanvasEdge) => this.applyDefaultEdgeStyles(canvas, edge)
    ))
  }

  private modifyCanvasSettings(canvas: Canvas | null) {
    if (!canvas) return

    canvas.config.defaultTextNodeDimensions = {
      width: this.plugin.settings.getSetting('defaultTextNodeWidth'),
      height: this.plugin.settings.getSetting('defaultTextNodeHeight')
    }

    canvas.config.defaultFileNodeDimensions = {
      width: this.plugin.settings.getSetting('defaultFileNodeWidth'),
      height: this.plugin.settings.getSetting('defaultFileNodeHeight')
    }
  }

  private async onDoubleClick(canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) {
    if (event.defaultPrevented || event.target !== canvas.wrapperEl || canvas.isDragging || canvas.readonly) return
    preventDefault.value = true

    let pos = canvas.posFromEvt(event)

    switch (this.plugin.settings.getSetting('nodeTypeOnDoubleClick')) {
      case 'file':
        const file = await new FileSelectModal(this.plugin.app, undefined, true).awaitInput()

        if (this.plugin.settings.getSetting('alignDoubleClickedNodeToGrid')) pos = {
          x: Math.round((pos.x - (canvas.config.defaultFileNodeDimensions.width / 2)) / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE + (canvas.config.defaultFileNodeDimensions.width / 2),
          y: Math.round((pos.y - (canvas.config.defaultFileNodeDimensions.height / 2)) / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE + (canvas.config.defaultFileNodeDimensions.height / 2)
        }

        canvas.createFileNode({
          pos: pos,
          position: 'center',
          file: file
        })

        break
      default:
        if (this.plugin.settings.getSetting('alignDoubleClickedNodeToGrid')) pos = {
          x: Math.round((pos.x - (canvas.config.defaultTextNodeDimensions.width / 2)) / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE + (canvas.config.defaultTextNodeDimensions.width / 2),
          y: Math.round((pos.y - (canvas.config.defaultTextNodeDimensions.height / 2)) / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE + (canvas.config.defaultTextNodeDimensions.height / 2)
        }

        canvas.createTextNode({
          pos: pos,
          position: 'center'
        })

        break
    }
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

  private applyDefaultEdgeStyles(_canvas: Canvas, edge: CanvasEdge) {
    const edgeData = edge.getData()

    edge.setData({
      ...edgeData,
      styleAttributes: {
        ...edgeData.styleAttributes,
        ...this.plugin.settings.getSetting('defaultEdgeStyleAttributes')
      }
    })
  }
}