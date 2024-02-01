import { CanvasNode } from "src/types/Canvas"
import CanvasExtension from "./canvas-extension"

const GROUP_NODE = {
  defaultLabel: 'New Group',
  defaultSize: { width: 500, height: 250 },
}

export default class GroupCanvasExtension extends CanvasExtension {
  onNodeChanged(_node: CanvasNode): void {}
  onPopupMenuCreated(): void {}

  onCardMenuCreated(): void {
    this.addCardMenuOption(
      this.createCardMenuOption(
        'create-group', 
        'Create group', 
        'group', 
        () => this.addGroupNode()
      )
    )
  }

  private addGroupNode() {
    const canvas = this.canvas
    if (!canvas) return

    canvas.createGroupNode({
      pos: this.getCenterCoordinates(GROUP_NODE.defaultSize),
      size: GROUP_NODE.defaultSize,
      label: GROUP_NODE.defaultLabel,
      save: true,
      focus: true,
    })
  }
}