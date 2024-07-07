import { Canvas, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../core/canvas-extension"

export default class GroupCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  private onCanvasChanged(canvas: Canvas) {
    const groupNodeSize = {
      width: this.plugin.settings.getSetting('defaultGroupNodeWidth'),
      height: this.plugin.settings.getSetting('defaultGroupNodeHeight')
    }

    const cardMenuOption = CanvasHelper.createCardMenuOption(
      canvas,
      {
        id: 'create-group',
        label: 'Drag to add group',
        icon: 'group'
      },
      () => groupNodeSize,
      (canvas: Canvas, pos: Position) => {
        canvas.createGroupNode({
          pos: pos,
          size: groupNodeSize
        })
      }
    )

    CanvasHelper.addCardMenuOption(canvas, cardMenuOption)
  }
}