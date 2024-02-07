import { Canvas, Position } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/events/events"

const GROUP_NODE_SIZE = { width: 300, height: 300 }

export default class GroupCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: any) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => {
        CanvasHelper.addCardMenuOption(
          canvas,
          CanvasHelper.createCardMenuOption(
            canvas,
            'create-group',
            'Create group',
            'group',
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