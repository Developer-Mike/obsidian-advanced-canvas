import { setIcon } from "obsidian"
import { BBox, Canvas, CanvasData, CanvasNode, CanvasNodeData, SelectionData } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasGroupNodeData } from "src/@types/AdvancedJsonCanvas"

const COLLAPSE_BUTTON_ID = 'group-collapse-button'

export default class CollapsibleGroupsCanvasExtension extends CanvasExtension {
  isEnabled() { return 'collapsibleGroupsFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-bbox-requested',
      (canvas: Canvas, node: CanvasNode, bbox: BBox) => this.onNodeBBoxRequested(canvas, node, bbox)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:copy',
      (canvas: Canvas, selectionData: SelectionData) => this.onCopy(canvas, selectionData)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-requested',
      (_canvas: Canvas, data: CanvasData) => this.expandAllCollapsedNodes(data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:load-data',
      (_canvas: Canvas, data: CanvasData, _setData: (data: CanvasData) => void) => this.collapseNodes(data)
    ))
  }

  private onNodeChanged(canvas: Canvas, groupNode: CanvasNode) {
    const groupNodeData = groupNode.getData() as CanvasGroupNodeData
    if (groupNodeData.type !== 'group') return

    // Remove the collapse/expand button
    groupNode.nodeEl?.querySelectorAll(`#${COLLAPSE_BUTTON_ID}`).forEach((el) => el.remove())

    // Add collapse/expand button next to the label
    const collapseButton = document.createElement('span')
    collapseButton.id = COLLAPSE_BUTTON_ID
    setIcon(collapseButton, groupNodeData.collapsed ? 'plus-circle' : 'minus-circle')

    collapseButton.onclick = () => {
      const groupNodeData = groupNode.getData() as CanvasGroupNodeData
      this.setCollapsed(canvas, groupNode, groupNodeData.collapsed ? undefined : true)
      canvas.markMoved(groupNode)
    }

    groupNode.labelEl?.insertAdjacentElement('afterend', collapseButton)
  }

  private onCopy(_canvas: Canvas, selectionData: SelectionData) {
    for (const collapsedGroupData of selectionData.nodes) {
      if (collapsedGroupData.type !== 'group' || !collapsedGroupData.isCollapsed || !collapsedGroupData.collapsedData) continue

      selectionData.nodes.push(...collapsedGroupData.collapsedData.nodes.map(nodeData => ({ 
        ...nodeData,
        // Restore the relative position of the node to the group
        x: nodeData.x + collapsedGroupData.x,
        y: nodeData.y + collapsedGroupData.y
      })))
      selectionData.edges.push(...collapsedGroupData.collapsedData.edges)
    }
  }

  private setCollapsed(canvas: Canvas, groupNode: CanvasNode, collapsed: boolean | undefined) {
    groupNode.setData({ ...groupNode.getData(), isCollapsed: collapsed })
    canvas.setData(canvas.getData())

    canvas.history.current--
    canvas.pushHistory(canvas.getData())
  }

  onNodeBBoxRequested(_canvas: Canvas, node: CanvasNode, bbox: BBox) {
    const nodeData = node.getData()
    if (nodeData.type !== 'group' || !nodeData.isCollapsed) return

    // Set width to label width
    bbox.maxX = bbox.minX + (node.nodeEl?.getBoundingClientRect().width ?? 0)
    
    // Set height of to 0 (Don't drag any nodes with it)
    bbox.maxY = bbox.minY
  }

  private expandAllCollapsedNodes(data: CanvasData) {
    data.nodes = data.nodes.flatMap((groupNodeData) => {
      const collapsedData = groupNodeData.collapsedData
      if (collapsedData === undefined) return [groupNodeData]

      groupNodeData.collapsedData = undefined

      data.edges.push(...collapsedData.edges)
      return [groupNodeData, ...collapsedData.nodes.map(nodeData => (
        {
          ...nodeData,
          // Restore the relative position of the node to the group
          x: nodeData.x + groupNodeData.x,
          y: nodeData.y + groupNodeData.y
        }
      ))]
    })
  }

  /*
  private expandAllCollapsedNodes(data: CanvasData) {
    const groupNodesData = data.nodes.filter(nodeData => nodeData.type === 'group' && nodeData.isCollapsed)

    for (const groupNodeData of groupNodesData) {
      this.expandCollapsedNode({ data, groupNodeData })
    }

    console.log(data)
  }

  private expandCollapsedNode(ref: { data: CanvasData, groupNodeData: CanvasNodeData }) {
    ref.groupNodeData.isCollapsed = false

    const collapsedData = ref.groupNodeData.collapsedData
    if (collapsedData === undefined) return

    ref.data.nodes.push(...collapsedData.nodes.map((nodeData) => {
      nodeData.x += ref.groupNodeData.x,
      nodeData.y += ref.groupNodeData.y

      return nodeData
    }))
    ref.data.edges.push(...collapsedData.edges)

    delete ref.groupNodeData.collapsedData
  }*/

  private collapseNodes(data: CanvasData) {
    data.nodes.forEach((groupNodeData) => {
      if (!groupNodeData.isCollapsed) return

      const groupNodeBBox = CanvasHelper.getBBox([groupNodeData])
      const containedNodesData = data.nodes.filter((nodeData) =>
        nodeData.id !== groupNodeData.id && BBoxHelper.insideBBox(CanvasHelper.getBBox([nodeData]), groupNodeBBox, false)
      )
      const containedEdgesData = data.edges.filter((edgeData) => {
        return containedNodesData.some((nodeData) => nodeData.id === edgeData.fromNode) || 
          containedNodesData.some((nodeData) => nodeData.id === edgeData.toNode)
      })

      data.nodes = data.nodes.filter((nodeData) => !containedNodesData.includes(nodeData))
      data.edges = data.edges.filter((edgeData) => !containedEdgesData.includes(edgeData))

      groupNodeData.collapsedData = {
        nodes: containedNodesData.map((nodeData) => (
          {
            ...nodeData,
            // Store the relative position of the node to the group
            x: nodeData.x - groupNodeData.x,
            y: nodeData.y - groupNodeData.y
          }
        )),
        edges: containedEdgesData
      }
    })
  }
}