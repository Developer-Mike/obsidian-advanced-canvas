import { Canvas } from "src/types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/events/events"

const GROUP_NODE = {
  defaultLabel: 'New Group',
  defaultSize: { width: 500, height: 250 },
}

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
            'create-group',
            'Create group',
            'group', 
            () => this.addGroupNode(canvas)
          )
        )
      }
    ))
  }

  private addGroupNode(canvas: Canvas) {
    canvas.createGroupNode({
      pos: CanvasHelper.getCenterCoordinates(canvas, GROUP_NODE.defaultSize),
      size: GROUP_NODE.defaultSize,
      label: GROUP_NODE.defaultLabel,
      save: true,
      focus: true,
    })
  }
}