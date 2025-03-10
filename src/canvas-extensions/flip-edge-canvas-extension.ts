import { Canvas, CanvasEdge } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import CanvasHelper from "src/utils/canvas-helper"

export default class FlipEdgeCanvasExtension extends CanvasExtension {
  isEnabled() { return 'flipEdgeFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas) {
    const popupMenuEl = canvas?.menu?.menuEl
    if (!popupMenuEl) return

    const POSSIBLE_ICONS = ['lucide-arrow-right', 'lucide-move-horizontal', 'line-horizontal']
    let edgeDirectionButton = null
    for (const icon of POSSIBLE_ICONS) {
      edgeDirectionButton = popupMenuEl.querySelector(`button:not([id]) > .svg-icon.${icon}`)?.parentElement
      if (edgeDirectionButton) break
    }
    if (!edgeDirectionButton) return

    edgeDirectionButton.addEventListener('click', () => this.onEdgeDirectionDropdownCreated(canvas))
  }

  private onEdgeDirectionDropdownCreated(canvas: Canvas) {
    const dropdownEl = document.body.querySelector('div.menu')
    if (!dropdownEl) return

    const separatorEl = CanvasHelper.createDropdownSeparatorElement()
    dropdownEl.appendChild(separatorEl)

    const flipEdgeButton = CanvasHelper.createDropdownOptionElement({
      icon: 'flip-horizontal-2',
      label: 'Flip Edge',
      callback: () => this.flipEdge(canvas)
    })
    dropdownEl.appendChild(flipEdgeButton)
  }

  private flipEdge(canvas: Canvas) {
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    if (selectedEdges.length === 0) return

    for (const edge of selectedEdges) {
      const edgeData = edge.getData()

      edge.setData({
        ...edgeData,
        fromNode: edgeData.toNode,
        fromSide: edgeData.toSide,

        toNode: edgeData.fromNode,
        toSide: edgeData.fromSide
      })
    }

    canvas.pushHistory(canvas.getData())
  }
}