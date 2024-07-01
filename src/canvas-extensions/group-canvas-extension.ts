import { Canvas, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../core/canvas-extension"

const GROUP_NODE_SIZE = { width: 300, height: 300 }

export default class GroupCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => {
        CanvasHelper.addCardMenuOption(
          canvas,
          CanvasHelper.createCardMenuOption(
            canvas,
            {
              id: 'create-group',
              label: 'Drag to add group',
              icon: 'group'
            },
            () => GROUP_NODE_SIZE,
            (canvas: Canvas, pos: Position) => {
              canvas.createGroupNode({
                pos: pos,
                size: GROUP_NODE_SIZE
              })
            }
          )
        )
      }
    ))
  }
}