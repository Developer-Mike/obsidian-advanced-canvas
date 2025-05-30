import { setIcon } from "obsidian"
import { BBox, Canvas, CanvasNode, SelectionData } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasData, CanvasGroupNodeData } from "src/@types/AdvancedJsonCanvas"

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
      'advanced-canvas:data-loaded:before',
      (_canvas: Canvas, data: CanvasData, _setData: (data: CanvasData) => void) => this.collapseNodes(data)
    ))
  }

  private onNodeChanged(canvas: Canvas, groupNode: CanvasNode) {
    const groupNodeData = groupNode.getData() as CanvasGroupNodeData
    if (groupNodeData.type !== 'group') return

    // Remove the collapse/expand button
    groupNode.collapseEl?.remove()

    // Add collapse/expand button next to the label
    const collapseEl = document.createElement('span')
    collapseEl.className = 'collapse-button'
    setIcon(collapseEl, groupNodeData.collapsed ? 'plus-circle' : 'minus-circle')

    collapseEl.onclick = () => {
      const groupNodeData = groupNode.getData() as CanvasGroupNodeData
      this.setCollapsed(canvas, groupNode, groupNodeData.collapsed ? undefined : true)
      canvas.markMoved(groupNode)
    }

    groupNode.collapseEl = collapseEl
    groupNode.labelEl?.insertAdjacentElement('afterend', collapseEl)
  }

  private onCopy(_canvas: Canvas, selectionData: SelectionData) {
    for (const collapsedGroupData of selectionData.nodes as CanvasGroupNodeData[]) {
      if (collapsedGroupData.type !== 'group' || !collapsedGroupData.collapsed || !collapsedGroupData.collapsedData) continue

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
    groupNode.setData({ ...groupNode.getData(), collapsed: collapsed })
    canvas.setData(canvas.getData())

    canvas.history.current--
    canvas.pushHistory(canvas.getData())
  }

  onNodeBBoxRequested(canvas: Canvas, node: CanvasNode, bbox: BBox) {
    const nodeData = node.getData() as CanvasGroupNodeData
    if (nodeData.type !== 'group' || !nodeData.collapsed) return

    const collapseElBBox = node.collapseEl?.getBoundingClientRect()
    if (!collapseElBBox) return

    const labelElBBox = node.labelEl?.getBoundingClientRect()
    if (!labelElBBox) return

    const minPos = canvas.posFromClient({ x: collapseElBBox.left, y: collapseElBBox.top })
    const maxPos = canvas.posFromClient({ x: labelElBBox.right, y: collapseElBBox.bottom })

    bbox.minX = minPos.x
    bbox.minY = minPos.y
    bbox.maxX = maxPos.x
    bbox.maxY = maxPos.y
  }

  private expandAllCollapsedNodes(data: CanvasData) {
    data.nodes = data.nodes.flatMap((groupNodeData: CanvasGroupNodeData) => {
      const collapsedData = groupNodeData.collapsedData
      if (collapsedData === undefined) return [groupNodeData]

      delete groupNodeData.collapsedData // Remove the intermediate value

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

  private collapseNodes(data: CanvasData) {
    data.nodes.forEach((groupNodeData: CanvasGroupNodeData) => {
      if (!groupNodeData.collapsed) return

      const groupNodeBBox = CanvasHelper.getBBox([groupNodeData])
      const containedNodesData = data.nodes.filter((nodeData) =>
        nodeData.id !== groupNodeData.id && BBoxHelper.insideBBox(CanvasHelper.getBBox([nodeData]), groupNodeBBox, false)
      )
      const containedEdgesData = data.edges.filter(edgeData => {
        return containedNodesData.some(nodeData => nodeData.id === edgeData.fromNode) || 
          containedNodesData.some(nodeData => nodeData.id === edgeData.toNode)
      })

      data.nodes = data.nodes.filter(nodeData => !containedNodesData.includes(nodeData))
      data.edges = data.edges.filter(edgeData => !containedEdgesData.includes(edgeData))

      groupNodeData.collapsedData = {
        nodes: containedNodesData.map(nodeData => (
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