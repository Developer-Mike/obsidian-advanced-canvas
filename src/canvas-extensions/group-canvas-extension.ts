import CanvasExtension from "./canvas-extension"

const GROUP_NODE = {
  defaultLabel: 'New Group',
  defaultSize: { width: 500, height: 250 },
}

export default class GroupCanvasExtension extends CanvasExtension {
  renderNode(_node: any): void {}
  renderMenu(): void {
    this.addMenuOption(
      this.createMenuOption(
        'create-group', 
        'Create group', 
        'group', 
        () => this.addGroupNode(this.canvas)
      )
    )
  }

  private addGroupNode(canvas: any) {
    canvas.createGroupNode({
      pos: this.getCenterCoordinates(GROUP_NODE.defaultSize),
      size: GROUP_NODE.defaultSize,
      label: GROUP_NODE.defaultLabel,
      save: true,
      focus: true,
    })
  }
}