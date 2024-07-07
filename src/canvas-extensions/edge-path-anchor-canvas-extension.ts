import { Canvas, CanvasEdge, CanvasNode, NodeInteractionLayer, Position } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../core/canvas-extension"
import { Menu } from "obsidian"
import BBoxHelper from "src/utils/bbox-helper"

const EDGE_PATH_ANCHOR_SIZE = 20
const EDGE_PATH_ANCHOR_INTERACTION_PADDING = 5

export default class EdgePathAnchorCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.EdgeContextMenu,
      (menu: Menu, edge: CanvasEdge) => this.onEdgeContextMenu(menu, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeEditingStarted.Before,
      (canvas: Canvas, node: CanvasNode, cancelled: { value: boolean }) => this.onNodeEditingStarted(canvas, node, cancelled)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeInteractionLayerRender,
      (canvas: Canvas, nodeInteractionLayer: NodeInteractionLayer) => this.onNodeInteractionLayerRender(canvas, nodeInteractionLayer)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeRemoved,
      (canvas: Canvas, node: CanvasNode) => this.onNodeRemoved(canvas, node)
    ))
  }

  private createEdgePathAnchor(canvas: Canvas, pos: Position, edge?: CanvasEdge) {
    console.log(canvas)

    const anchorNode = canvas.createTextNode({
      pos: pos,
      size: { width: EDGE_PATH_ANCHOR_SIZE, height: EDGE_PATH_ANCHOR_SIZE },
    })
    const anchorNodeData = anchorNode.getData()

    anchorNode.setData({
      ...anchorNodeData,
      isEdgePathAnchor: true
    })
    anchorNode.blur()

    if (!edge) return
    edge.blur()

    /* const newEdge = edge.constructor(
      canvas, 
      CanvasHelper.generateRandomId(), 
      {
        end: 'none',
        node: anchorNode,
        side: BBoxHelper.oppositeSide(edgeData.fromSide)
      },
      {
        end: 'none',
        node: edge.to.node,
        side: edge.to.side
      }
    )
    console.log(newEdge) */

    edge.update(canvas, 
      {
        end: edge.from.end,
        node: edge.from.node,
        side: edge.from.side
      },
      {
        end: 'none',
        node: anchorNode,
        side: edge.to.side
      }
    )

    // canvas.pushHistory(canvas.getData())
  }

  private onCanvasChanged(canvas: Canvas) {
    const cardMenuOption = CanvasHelper.createCardMenuOption(
      canvas,
      {
        id: 'create-edge-path-anchor',
        label: 'Drag to create edge path anchor',
        icon: 'diamond'
      },
      () => { return { width: EDGE_PATH_ANCHOR_SIZE, height: EDGE_PATH_ANCHOR_SIZE } },
      (canvas: Canvas, pos: Position) => this.createEdgePathAnchor(canvas, pos)
    )

    CanvasHelper.addCardMenuOption(canvas, cardMenuOption)
  }

  private onEdgeContextMenu(menu: Menu, edge: CanvasEdge) {
    const canvas = edge.canvas
    const mousePos = canvas.pointer
    const pos = {
      x: Math.round((mousePos.x - EDGE_PATH_ANCHOR_SIZE / 2) / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE,
      y: Math.round((mousePos.y - EDGE_PATH_ANCHOR_SIZE / 2) / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE
    }

    menu.addItem((item) =>
      item.setSection('canvas')
        .setTitle('Add anchor point')
        .setIcon('diamond')
        .onClick(() => this.createEdgePathAnchor(canvas, pos, edge))
    )
  }

  private onNodeEditingStarted(_canvas: Canvas, node: CanvasNode, cancelled: { value: boolean }) {
    if (!node.getData()?.isEdgePathAnchor) return

    cancelled.value = true
  }

  private onNodeInteractionLayerRender(_canvas: Canvas, nodeInteractionLayer: NodeInteractionLayer) {
    if (!nodeInteractionLayer.target || !nodeInteractionLayer.target?.getData()?.isEdgePathAnchor) return

    // Add some space to the four connection points
    const bbox = nodeInteractionLayer.target.getBBox()
    nodeInteractionLayer.interactionEl?.setCssStyles({
      transform: `translate(${bbox.minX - EDGE_PATH_ANCHOR_INTERACTION_PADDING}px, ${bbox.minY - EDGE_PATH_ANCHOR_INTERACTION_PADDING}px)`,
      width: `${bbox.maxX - bbox.minX + EDGE_PATH_ANCHOR_INTERACTION_PADDING * 2}px`,
      height: `${bbox.maxY - bbox.minY + EDGE_PATH_ANCHOR_INTERACTION_PADDING * 2}px`
    })
  }

  private onNodeRemoved(canvas: Canvas, node: CanvasNode) {
    /*const nodeData = node.getData()
    if (!nodeData.isEdgePathAnchor) return

    const connectedEdges = canvas.getEdgesForNode(node)
    const fromLocations = connectedEdges.map((edge) => edge.getData().from).filter(from => from.node !== node)
    const toLocations = connectedEdges.map((edge) => edge.getData().to).filter(to => to.node !== node)

    for (const from of fromLocations) {
      for (const to of toLocations) {
        canvas.addEdge({
          from: from,
          to: to,
        })
      }
    }*/
  }
}