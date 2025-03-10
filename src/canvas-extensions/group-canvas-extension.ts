import { Canvas, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const GROUP_NODE_SIZE = { width: 300, height: 300 }

export default class GroupCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
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