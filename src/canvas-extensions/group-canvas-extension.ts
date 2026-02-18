import { Canvas, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import BBoxHelper from "src/utils/bbox-helper"

const GROUP_NODE_SIZE = { width: 300, height: 300 }
const GROUP_NODE_PADDING = 20

export default class GroupCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.addCommand({
      id: 'create-group-around-selection',
      name: 'Group selected nodes',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.selection.size > 0,
        (canvas: Canvas) => this.createGroupAroundSelection(canvas)
      )
    })

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

  private createGroupAroundSelection(canvas: Canvas) {
    const bbox = BBoxHelper.combineBBoxes(
      Array.from(canvas.selection.values())
        .map(e => e.getBBox())
    )
    const paddedBBox = BBoxHelper.enlargeBBox(bbox, GROUP_NODE_PADDING)

    canvas.createGroupNode({
      pos: { x: paddedBBox.minX, y: paddedBBox.minY },
      size: {
        width: paddedBBox.maxX - paddedBBox.minX,
        height: paddedBBox.maxY - paddedBBox.minY
      }
    })
  }
}
