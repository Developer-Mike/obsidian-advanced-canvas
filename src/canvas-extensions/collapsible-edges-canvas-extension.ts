import { setIcon } from "obsidian"
import { CanvasData, CanvasNodeData, Side } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasEdge, CanvasNode, Position } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const SIDES: Side[] = ['top', 'right', 'bottom', 'left']
const NODE_SPACING = 16

// FIXME: `collapsedEdgeSides` will be part of the JSON Canvas spec
type CollapsibleNodeData = CanvasNodeData & { collapsedEdgeSides?: Side[] }

export default class CollapsibleEdgesCanvasExtension extends CanvasExtension {
  isEnabled() { return true } // FIXME

  private toggleButtons = new WeakMap<Canvas, Map<string, Partial<Record<Side, HTMLElement>>>>()

  init() {
    // Fold before the data gets imported, expand before the data gets serialized
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-loaded:before',
      (_canvas: Canvas, data: CanvasData) => this.collapseNodes(data)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-requested',
      (_canvas: Canvas, data: CanvasData) => this.expandNodes(data)
    ))

    // The buttons follow the structure of the live canvas
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:data-loaded:after',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-added',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-removed',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-changed',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-created',
      (canvas: Canvas) => this.update(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-removed',
      (canvas: Canvas) => this.update(canvas)
    ))

    // Panning/zooming and node movement only move the toggles, they don't change the collapse state
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:viewport-changed:after',
      (canvas: Canvas) => this.repositionAll(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-moved',
      (canvas: Canvas) => this.repositionAll(canvas)
    ))
  }

  private getOutgoingEdges(canvas: Canvas, node: CanvasNode): CanvasEdge[] {
    return canvas.getEdgesForNode(node).filter(edge => edge.from.node === node)
  }

  private setCollapsedSides(canvas: Canvas, node: CanvasNode, sides: Side[] | undefined) {
    const data = { ...node.getData() } as CollapsibleNodeData
    if (!sides?.length) delete data.collapsedEdgeSides
    else data.collapsedEdgeSides = sides

    node.setData(data)

    // FIXME
    canvas.setData(canvas.getData())
    canvas.history.current--
    canvas.pushHistory(canvas.getData())
    canvas.requestSave()
  }

  private toggleCollapse(canvas: Canvas, node: CanvasNode, side: Side) {
    const sides = [...(node.getData() as CollapsibleNodeData).collapsedEdgeSides ?? []]
    const index = sides.indexOf(side)
    if (index !== -1) sides.splice(index, 1)
    else sides.push(side)

    this.setCollapsedSides(canvas, node, sides)
  }

  private computeFoldedNodes(data: CanvasData, collapsedSides: Map<string, Side[]>): Set<string> {
    const incomingEdges = new Map<string, { fromNode: string, fromSide: Side }[]>()
    for (const edge of data.edges) {
      const parents = incomingEdges.get(edge.toNode) ?? []
      parents.push({ fromNode: edge.fromNode, fromSide: edge.fromSide })
      incomingEdges.set(edge.toNode, parents)
    }

    const hiddenNodes = new Set<string>()
    let changed = true
    while (changed) {
      changed = false
      for (const [nodeId, parents] of incomingEdges) {
        if (hiddenNodes.has(nodeId) || collapsedSides.has(nodeId)) continue
        if (parents.every(parent =>
          (collapsedSides.get(parent.fromNode) ?? []).includes(parent.fromSide) || hiddenNodes.has(parent.fromNode)
        )) {
          hiddenNodes.add(nodeId)
          changed = true
        }
      }
    }
    return hiddenNodes
  }

  private collapseNodes(data: CanvasData) {
    if (!data?.nodes?.length) return

    const collapsedSides = new Map<string, Side[]>()
    for (const node of data.nodes) {
      const sides = (node as CollapsibleNodeData).collapsedEdgeSides
      if (sides?.length) collapsedSides.set(node.id, sides)
    }
    if (collapsedSides.size === 0) return

    const hiddenNodes = this.computeFoldedNodes(data, collapsedSides)
    if (hiddenNodes.size === 0) return

    const assignedNodes = new Set<string>()
    const assignedEdges = new Set<string>()

    for (const initiator of data.nodes) {
      const initiatorData = initiator as CollapsibleNodeData
      const sides = initiatorData.collapsedEdgeSides
      if (!sides?.length) continue

      for (const side of sides) {
        // Walk the folded graph from this initiator's collapsed side
        const owned = new Set<string>()
        const queue: string[] = []
        for (const edge of data.edges.filter(edge => edge.fromNode === initiator.id && edge.fromSide === side)) {
          if (edge.toNode !== initiator.id && hiddenNodes.has(edge.toNode) && !owned.has(edge.toNode)) {
            owned.add(edge.toNode)
            queue.push(edge.toNode)
          }
        }
        for (let index = 0; index < queue.length; index++) {
          for (const edge of data.edges.filter(edge => edge.fromNode === queue[index])) {
            if (hiddenNodes.has(edge.toNode) && !owned.has(edge.toNode)) {
              owned.add(edge.toNode)
              queue.push(edge.toNode)
            }
          }
        }

        const newOwned = [...owned].filter(nodeId => !assignedNodes.has(nodeId))
        const foldedEdges = data.edges.filter(edge => {
          if (assignedEdges.has(edge.id)) return false
          return (edge.fromNode === initiator.id && edge.fromSide === side) ||
            owned.has(edge.fromNode) || owned.has(edge.toNode)
        })
        if (newOwned.length === 0 && foldedEdges.length === 0) continue

        for (const nodeId of newOwned) assignedNodes.add(nodeId)
        for (const edge of foldedEdges) assignedEdges.add(edge.id)

        const foldedNodeIds = new Set(newOwned)
        const collapsedData = initiatorData.collapsedEdgeData?.[side] ?? { nodes: [], edges: [] }
        collapsedData.nodes.push(...data.nodes.filter(node => foldedNodeIds.has(node.id)).map(node => ({ ...node })))
        collapsedData.edges.push(...foldedEdges.map(edge => ({ ...edge })))
        initiatorData.collapsedEdgeData = { ...initiatorData.collapsedEdgeData, [side]: collapsedData }
      }
    }

    // Completely remove the folded elements from the canvas data
    data.nodes = data.nodes.filter(node => !assignedNodes.has(node.id))
    data.edges = data.edges.filter(edge => !assignedEdges.has(edge.id))
  }

  private expandNodes(data: CanvasData) {
    for (const node of [...data.nodes ?? []]) {
      const nodeData = node as CollapsibleNodeData
      const collapsed = nodeData.collapsedEdgeData
      if (!collapsed) continue

      for (const side of SIDES) {
        const content = collapsed[side]
        if (!content) continue
        data.nodes.push(...content.nodes.map(nodeData => ({ ...nodeData })))
        data.edges.push(...content.edges.map(edgeData => ({ ...edgeData })))
      }
      delete nodeData.collapsedEdgeData
    }
  }

  private update(canvas: Canvas) {
    // Drop buttons whose node is no longer mounted (e.g. folded away)
    const buttonsByNode = this.toggleButtons.get(canvas)
    if (buttonsByNode) {
      for (const nodeId of [...buttonsByNode.keys()]) {
        if (!canvas.nodes.has(nodeId)) {
          this.removeButtons(buttonsByNode.get(nodeId) ?? {})
          buttonsByNode.delete(nodeId)
        }
      }
    }

    for (const node of canvas.nodes.values()) this.updateToggleButtons(canvas, node)
  }

  private updateToggleButtons(canvas: Canvas, node: CanvasNode) {
    const nodeId = node.getData().id
    const buttonsByNode = this.toggleButtons.get(canvas) ?? new Map<string, Partial<Record<Side, HTMLElement>>>()
    let buttons = buttonsByNode.get(nodeId)

    const collapsedSides = (node.getData() as CollapsibleNodeData).collapsedEdgeSides ?? []
    const shownSides = new Set<Side>(collapsedSides)
    for (const side of this.getCollapsibleSides(canvas, node)) shownSides.add(side)

    for (const side of SIDES) {
      if (shownSides.has(side)) continue

      const button = buttons?.[side]
      if (!button) continue
      button.remove()
      delete buttons![side]
    }

    if (shownSides.size === 0) {
      if (buttons && Object.keys(buttons).length === 0) buttonsByNode.delete(nodeId)
      this.toggleButtons.set(canvas, buttonsByNode)
      return
    }

    buttons ??= {}
    for (const side of SIDES) {
      if (!shownSides.has(side)) continue

      let button = buttons[side]
      if (!button) {
        button = canvas.wrapperEl.createDiv()
        button.className = 'ce-edge-collapse-toggle'
        button.dataset.side = side

        // Don't let the toggle start an edge drag, move the node or select it
        button.addEventListener('pointerdown', (e: PointerEvent) => e.stopPropagation())
        button.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.toggleCollapse(canvas, node, side)
        })

        canvas.wrapperEl.append(button)
        buttons[side] = button
      }

      const collapsed = collapsedSides.includes(side)
      setIcon(button, collapsed ? 'plus-circle' : 'minus-circle')
      button.setAttribute('aria-label', collapsed ? `Expand ${side} edges` : `Collapse ${side} edges`)
      this.updateTogglePosition(canvas, node, side, button)
    }

    buttonsByNode.set(nodeId, buttons)
    this.toggleButtons.set(canvas, buttonsByNode)
  }

  private getCollapsibleSides(canvas: Canvas, node: CanvasNode): Side[] {
    const sideEdges = new Map<Side, CanvasEdge[]>()
    for (const edge of this.getOutgoingEdges(canvas, node)) {
      const side = edge.getData().fromSide
      const edges = sideEdges.get(side) ?? []
      edges.push(edge)
      sideEdges.set(side, edges)
    }

    const collapsibleSides: Side[] = []
    for (const [side, edges] of sideEdges) {
      if (edges.every(edge => this.isFoldableTarget(canvas, node, side, edge))) collapsibleSides.push(side)
    }
    return collapsibleSides
  }

  private isFoldableTarget(canvas: Canvas, node: CanvasNode, side: Side, edge: CanvasEdge): boolean {
    const targetNode = edge.to.node
    return canvas.getEdgesForNode(targetNode)
      .filter(edge => edge.to.node === targetNode)
      .every(edge => edge.from.node === node && edge.getData().fromSide === side)
  }

  private getSidePosition(node: CanvasNode, side: Side): Position {
    const nodeBBox = CanvasHelper.getBBox([node.getData()])
    const position = BBoxHelper.getCenterOfBBoxSide(nodeBBox, side)
    switch (side) {
      case 'top': position.y -= NODE_SPACING; break
      case 'right': position.x += NODE_SPACING; break
      case 'bottom': position.y += NODE_SPACING; break
      case 'left': position.x -= NODE_SPACING; break
    }
    return position
  }

  private updateTogglePosition(canvas: Canvas, node: CanvasNode, side: Side, button: HTMLElement) {
    const rect = canvas.wrapperEl.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const start: Position = this.getSidePosition(node, side)
    const zoom = Math.pow(2, canvas.tZoom)
    const x = (start.x - canvas.tx) * zoom + rect.width / 2
    const y = (start.y - canvas.ty) * zoom + rect.height / 2

    button.style.left = `${x}px`
    button.style.top = `${y}px`
  }

  private repositionAll(canvas: Canvas) {
    const buttonsByNode = this.toggleButtons.get(canvas)
    if (!buttonsByNode) return

    for (const node of canvas.nodes.values()) {
      const buttons = buttonsByNode.get(node.getData().id)
      if (!buttons) continue
      for (const side of SIDES) {
        const button = buttons[side]
        if (button) this.updateTogglePosition(canvas, node, side, button)
      }
    }
  }

  private removeButtons(buttons: Partial<Record<Side, HTMLElement>>) {
    for (const side of SIDES) {
      const button = buttons[side]
      if (button) button.remove()
    }
  }
}
