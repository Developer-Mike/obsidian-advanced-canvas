import { Canvas, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../core/canvas-extension"
import CanvasHelper from "src/utils/canvas-helper"
import { ViewUpdate } from "@codemirror/view"

export default class AutoResizeNodeCanvasExtension  extends CanvasExtension {
  isEnabled() { return this.plugin.settings.getSetting('autoResizeNodeFeatureEnabled') }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeTextContentChanged,
      (canvas: Canvas, node: CanvasNode, viewUpdate: ViewUpdate) => this.onNodeTextContentChanged(canvas, node, viewUpdate)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas) {
    if (canvas.readonly) return

    const selectedNodes = [...canvas.selection].filter(element => {
      const elementData = element.getData()
      return elementData.type === 'text'
    }) as CanvasNode[]
    if (selectedNodes.length === 0) return

    const hasLockedHeight = selectedNodes.some(node => node.getData().lockedHeight)
    
    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'lock-height',
        label: 'Toggle locked height',
        icon: hasLockedHeight ? 'ruler' : 'pencil-ruler',
        callback: () => this.setLockedHeight(canvas, selectedNodes, hasLockedHeight)
      })
    )
  }

  private setLockedHeight(canvas: Canvas, nodes: CanvasNode[], lockedHeight: boolean) {
    const newLockedHeight = lockedHeight ? undefined : true

    nodes.forEach(node => node.setData({
      ...node.getData(),
      lockedHeight: newLockedHeight
    }))

    this.onPopupMenuCreated(canvas)
  }
  
  private async onNodeTextContentChanged(canvas: Canvas, node: CanvasNode, viewUpdate: ViewUpdate) {
    const nodeData = node.getData()
    if (nodeData.lockedHeight) return

    let textPadding = 0
    const cmScroller = viewUpdate.view.dom.querySelector(".cm-scroller")
    if (cmScroller) {
      for (const pseudo of ["before", "after"]) {
        const style = window.getComputedStyle(cmScroller, pseudo)
        const height = parseFloat(style.getPropertyValue("height"))

        textPadding += height
      }
    }

    let newHeight = viewUpdate.view.contentHeight + textPadding + 10

    if (this.plugin.settings.getSetting('autoResizeNodeSnapToGrid'))
      newHeight = Math.round(newHeight / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE

    node.setData({
      ...nodeData,
      height: newHeight
    })
  }
}