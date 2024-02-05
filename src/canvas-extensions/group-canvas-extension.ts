import { Canvas, CanvasNode } from "src/types/Canvas"
import CanvasExtension from "./canvas-extension"

const GROUP_NODE = {
  defaultLabel: 'New Group',
  defaultSize: { width: 500, height: 250 },
}

export default class GroupCanvasExtension extends CanvasExtension {
  onCanvasChanged(canvas: Canvas): void {
    this.addCardMenuOption(
      canvas,
      this.createCardMenuOption(
        'create-group',
        'Create group',
        'group', 
        () => this.addGroupNode(canvas)
      )
    )
  }

  onNodesChanged(_canvas: Canvas, _nodes: CanvasNode[]): void {}
  onPopupMenuCreated(_canvas: Canvas): void {}
  onNodeInteraction(_canvas: Canvas, _node: CanvasNode): void {}

  private addGroupNode(canvas: Canvas) {
    canvas.createGroupNode({
      pos: this.getCenterCoordinates(canvas, GROUP_NODE.defaultSize),
      size: GROUP_NODE.defaultSize,
      label: GROUP_NODE.defaultLabel,
      save: true,
      focus: true,
    })
  }
}