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
    setIcon(collapseButton, groupNodeData.collapsedData !== undefined ? 'plus-circle' : 'minus-circle')

    collapseButton.onclick = () => { this.toggleCollapse(canvas, groupNode) }

    groupNode.labelEl?.insertAdjacentElement('afterend', collapseButton)
  }

  toggleCollapse(canvas: Canvas, groupNode: CanvasNode) {
    const groupNodeData = groupNode.getData()
    const isCollapsed = groupNodeData.collapsedData === undefined

    if (isCollapsed) {
      // Collapse contained nodes
      const containedNodes = [...canvas.nodes.values()].filter((node: CanvasNode) => 
        node.getData().id !== groupNodeData.id && BBoxHelper.insideBBox(node.getBBox(), groupNode.getBBox(), true)
      )
      const containedEdges = [...canvas.edges.values()].filter((edge) => {
        const sourceNodeId = edge.from.node.getData().id
        const targetNodeId = edge.to.node.getData().id

        return containedNodes.some((node) => node.getData().id === sourceNodeId) || 
          containedNodes.some((node) => node.getData().id === targetNodeId)
      })
      const collapsedData = {
        nodes: containedNodes.map((node) => node.getData()).map((nodeData) => {
          // Store the relative position of the node to the group
          nodeData.x -= groupNodeData.x
          nodeData.y -= groupNodeData.y

          return nodeData
        }),
        edges: containedEdges.map((edge) => edge.getData())
      }

      containedNodes.forEach((node) => canvas.removeNode(node))
      containedEdges.forEach((edge) => canvas.removeEdge(edge))

      canvas.setNodeData(groupNode, 'collapsedData', collapsedData)
    } else {
      // Expand contained nodes
      canvas.setNodeData(groupNode, 'collapsedData', undefined)

      const collapsedData = groupNodeData.collapsedData
      if (!collapsedData) return

      // Move contained nodes to the group position
      collapsedData.nodes.map((nodeData) => {
        nodeData.x += groupNodeData.x
        nodeData.y += groupNodeData.y

        return nodeData
      })

      canvas.importData(collapsedData)
    }
  }
}