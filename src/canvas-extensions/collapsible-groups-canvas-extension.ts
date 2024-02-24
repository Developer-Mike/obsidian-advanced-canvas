import { setIcon } from "obsidian"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import { CanvasEvent } from "src/events/events"
import AdvancedCanvasPlugin from "src/main"
import * as BBoxHelper from "src/utils/bbox-helper"

const COLLAPSE_BUTTON_ID = 'group-collapse-button'

export default class CollapsibleGroupsCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('collapsibleGroupsFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeChanged,
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
    ))
  }

  onNodeChanged(canvas: Canvas, groupNode: CanvasNode) {
    const groupNodeData = groupNode.getData()
    if (groupNodeData.type !== 'group') return

    // Remove the collapse/expand button
    groupNode.nodeEl?.querySelectorAll(`#${COLLAPSE_BUTTON_ID}`).forEach((el) => el.remove())

    // Add collapse/expand button next to the label
    const collapseButton = document.createElement('span')
    collapseButton.id = COLLAPSE_BUTTON_ID
    setIcon(collapseButton, groupNodeData.isCollapsed ? 'plus-circle' : 'minus-circle')

    collapseButton.onclick = () => { this.toggleCollapse(canvas, groupNode) }

    groupNode.labelEl?.insertAdjacentElement('afterend', collapseButton)
  }

  toggleCollapse(canvas: Canvas, groupNode: CanvasNode) {
    const groupNodeData = groupNode.getData()
    const isCollapsed = !groupNodeData.isCollapsed

    // Collapse contained nodes
    const containedNodes = [...canvas.nodes.values()].filter((node: CanvasNode) => 
      BBoxHelper.insideBBox(node.getBBox(), groupNode.getBBox(), true) && node !== groupNode
    )

    const groupId = groupNodeData.id
    for (const containedNode of containedNodes) {
      if (isCollapsed && containedNode.getData().collapsedParentGroupId !== undefined) continue
      if (!isCollapsed && containedNode.getData().collapsedParentGroupId !== groupId) continue

      canvas.setNodeData(containedNode, 'collapsedParentGroupId', isCollapsed ? groupId : undefined)
    }

    canvas.setNodeData(groupNode, 'isCollapsed', isCollapsed ? true : undefined)
  }
}