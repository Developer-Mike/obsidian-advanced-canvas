// Added by an LLM agent
import { Menu, Notice } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasNode, Position } from "src/@types/Canvas"
import { CanvasFileNodeData, Side } from "src/@types/AdvancedJsonCanvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import { AbstractSelectionModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

/**
 * Added by an LLM agent.
 *
 * Node & content rotation:
 * - `rotation` (degrees clockwise, normalized to [0, 360)) rotates a node around its own center.
 *   It is purely visual: x/y/width/height in the data never change, so it is reversible and
 *   doesn't conflict with the ratio/snap features. Rotating a container (a group or an open
 *   portal) rigidly rotates all fully contained nodes with it (nested rotated containers
 *   compose). Open portals act as containers because their nested notes are real nodes fully
 *   contained in the portal's bbox.
 * - `contentRotation` (cardinal only: 0/90/180/270) rotates just the inner content via CSS
 *   (see styles/rotate-node.scss). E.g. a node rotated 90° CW + content rotation of 270°
 *   (= 90° CCW) makes the text read normally inside the rotated frame.
 *   `contentRotation` on a container (a group or an open portal) does NOT rotate the container's
 *   own content - it propagates to every fully contained node instead (their effective content
 *   rotation is the sum of their own and all containing containers', mod 360).
 *
 * Rendering: Obsidian's `CanvasNode.render()` writes the inline style
 * `transform: translate(xpx, ypx)` on the node element. The canvas patcher already fires
 * `advanced-canvas:node-rendered` right after - this extension rewrites the inline transform
 * synchronously in the same frame (no flicker, works at drag speed, no new monkey-patch needed).
 *
 * Edges: Obsidian's `CanvasEdge.updatePath()` anchors the path (and the arrow heads) to the
 * unrotated data bbox. The `advanced-canvas:edge-path-updated` hook re-anchors both ends:
 * the bezier end/control points, the border stubs and the arrow head transforms get rotated
 * around each node's composed center by its total rotation angle.
 *
 * Known limitations:
 * - Rubber-band selection & resize handles stay axis-aligned (rotation is a visual layer over
 *   data space).
 * - Edges with a pathfinding style (`pathfindingMethod`) are not re-anchored - the edge styles
 *   extension replaces their whole path after this extension's hook runs.
 * - While editing a content-rotated text node, the inline editor (iframe) may appear unrotated;
 *   the rotation shows in reading/preview.
 */

const CONTENT_ROTATION_OPTIONS: { label: string, value: 0 | 90 | 180 | 270 }[] = [
  { label: 'None', value: 0 },
  { label: '90° clockwise', value: 90 },
  { label: '180°', value: 180 },
  { label: '90° counter-clockwise', value: 270 }
]

/** Mirrors Obsidian's internal side -> arrow head rotation map (`q5` in obsidian.asar) */
const SIDE_ARROW_ANGLES: Record<Side, number> = { top: 180, bottom: 0, left: 90, right: 270 }

interface RotatedContainer {
  node: CanvasNode
  rotation: number
  bbox: BBox
  center: Position
}

/** Normalize an angle in degrees to [0, 360) */
function normalizeAngle(angle: number): number {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

/** Rotate a point around a center by the given angle (degrees clockwise, matching CSS `rotate()` in screen coordinates) */
function rotatePointAround(point: Position, center: Position, angleDeg: number): Position {
  if (angleDeg === 0) return point

  const rad = angleDeg * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

/** The smallest axis-aligned bbox containing all given points */
function pointsBBox(points: Position[]): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, minY, maxX, maxY }
}

function nodeBBox(node: CanvasNode): BBox {
  return { minX: node.x, minY: node.y, maxX: node.x + node.width, maxY: node.y + node.height }
}

export default class RotateNodeCanvasExtension extends CanvasExtension {
  isEnabled() { return 'nodeRotationFeatureEnabled' as const }

  /** Per-canvas cache: does any node/group have a rotation? Invalidated on data changes. */
  private rotationPresenceCache = new WeakMap<Canvas, boolean>()

  /** Edges whose path/arrow heads this extension re-anchored (so they get restored when unrotated) */
  private rotatedEdges = new WeakSet<CanvasEdge>()

  init() {
    // Recompute the transform right after Obsidian rendered the node (same frame, covers drag/resize)
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-rendered',
      (canvas: Canvas, node: CanvasNode) => {
        if (!this.getRotationPresence(canvas)) return
        this.updateNodeTransform(canvas, node, this.getRotatedContainers(canvas))
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas) => this.onRotationDataMaybeChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-removed',
      (canvas: Canvas) => this.onRotationDataMaybeChanged(canvas)
    ))

    // Full refresh triggers (all idempotent)
    for (const event of ['advanced-canvas:data-loaded:after', 'advanced-canvas:canvas-changed', 'advanced-canvas:undo', 'advanced-canvas:redo'] as const) {
      this.plugin.registerEvent(this.plugin.app.workspace.on(
        event,
        (canvas: Canvas) => this.onRotationDataMaybeChanged(canvas)
      ))
    }

    // Re-anchor edges to rotated nodes right after Obsidian recalculated the path
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-path-updated',
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgePathUpdated(canvas, edge)
    ))

    // Added by an LLM agent:
    // Obsidian's viewport virtualization (virtualize() in obsidian.asar) culls nodes/edges
    // whose DATA-space bbox doesn't intersect the viewport bbox (nodeIndex/edgeIndex search).
    // Rotation here is purely visual (CSS transform), so a rotated node - e.g. inside a rotated
    // open portal - can be visually on-screen while its data bbox is outside the viewport and
    // gets detached (it "disappears" when zooming in). Add visually intersecting elements back.
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:intersecting-nodes-requested',
      (canvas: Canvas, bbox: BBox, nodes: CanvasNode[]) => this.onIntersectingNodesRequested(canvas, bbox, nodes)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:intersecting-edges-requested',
      (canvas: Canvas, bbox: BBox, edges: CanvasEdge[]) => this.onIntersectingEdgesRequested(canvas, bbox, edges)
    ))

    // Mirror the effective content rotation into the editing iframe too (node-exposer pattern)
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (canvas: Canvas, node: CanvasNode, editing: boolean) => {
        if (!editing) return

        const iframeBody = node.nodeEl.querySelector('iframe')?.contentDocument?.body
        if (iframeBody) this.applyContentRotationAttribute(iframeBody, this.getEffectiveContentRotation(canvas, node))
      }
    ))

    // Context menus
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:node-menu',
      (menu: Menu, node: CanvasNode) => this.addRotationMenuItems(node.canvas, [node], menu)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:selection-menu',
      (menu: Menu, canvas: Canvas) => this.addRotationMenuItems(canvas, this.getSelectedNodes(canvas), menu)
    ))

    // Commands (hotkeyable, only when a canvas with a node selection is active)
    this.plugin.addCommand({
      id: 'rotate-selection-90-clockwise',
      name: 'Rotate selection 90° clockwise',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.getSelectionData().nodes.length > 0,
        (canvas: Canvas) => this.rotateNodesBy(canvas, this.getSelectedNodes(canvas), 90)
      )
    })

    this.plugin.addCommand({
      id: 'rotate-selection-90-counterclockwise',
      name: 'Rotate selection 90° counterclockwise',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.getSelectionData().nodes.length > 0,
        (canvas: Canvas) => this.rotateNodesBy(canvas, this.getSelectedNodes(canvas), -90)
      )
    })

    this.plugin.addCommand({
      id: 'rotate-selection-180',
      name: 'Rotate selection 180°',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.getSelectionData().nodes.length > 0,
        (canvas: Canvas) => this.rotateNodesBy(canvas, this.getSelectedNodes(canvas), 180)
      )
    })

    this.plugin.addCommand({
      id: 'reset-selection-rotation',
      name: 'Reset selection rotation',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.getSelectionData().nodes.length > 0,
        (canvas: Canvas) => this.setNodesRotation(canvas, this.getSelectedNodes(canvas), 0)
      )
    })
  }

  /**
   * Single entry point for every data change that can affect rotations (idempotent).
   * Updates node transforms, content rotation attributes and edge paths.
   */
  private onRotationDataMaybeChanged(canvas: Canvas) {
    this.rotationPresenceCache.delete(canvas)

    // If rotations exist, a moved/resized/rotated container changes the pivot of all its
    // members -> refresh all nodes. Otherwise restore every node we previously rewrote
    // (e.g. the members of a container whose rotation was just removed).
    if (this.getRotationPresence(canvas)) {
      this.updateAllNodeTransforms(canvas, this.getRotatedContainers(canvas))
    } else {
      for (const node of canvas.nodes.values()) {
        const vanillaTransform = `translate(${node.x}px, ${node.y}px)` // Obsidian's own format
        if (node.nodeEl.style.transform !== vanillaTransform) this.updateNodeTransform(canvas, node, [])
      }
    }

    this.updateAllContentRotationAttributes(canvas)
    this.refreshEdges(canvas, this.getRotatedContainers(canvas))
  }

  private getSelectedNodes(canvas: Canvas): CanvasNode[] {
    return canvas.getSelectionData().nodes
      .map(nodeData => canvas.nodes.get(nodeData.id))
      .filter(node => node !== undefined) as CanvasNode[]
  }

  private addRotationMenuItems(canvas: Canvas, nodes: CanvasNode[], menu: Menu) {
    if (canvas.readonly || nodes.length === 0) return

    menu.addSeparator()

    menu.addItem(item => {
      item.setTitle('Rotate 90° clockwise')
      item.setIcon('rotate-cw')
      item.onClick(() => this.rotateNodesBy(canvas, nodes, 90))
    })

    menu.addItem(item => {
      item.setTitle('Rotate 90° counterclockwise')
      item.setIcon('rotate-ccw')
      item.onClick(() => this.rotateNodesBy(canvas, nodes, -90))
    })

    menu.addItem(item => {
      item.setTitle('Rotate 180°')
      item.setIcon('refresh-cw')
      item.onClick(() => this.rotateNodesBy(canvas, nodes, 180))
    })

    menu.addItem(item => {
      item.setTitle('Set rotation angle…')
      item.setIcon('compass')
      item.onClick(async () => {
        const input = await new AbstractSelectionModal(
          this.plugin.app,
          'Enter a rotation angle in degrees (clockwise)',
          ['0', '45', '90', '135', '180', '225', '270', '315'],
          true // Allow arbitrary angles
        ).awaitInput()

        const angle = Number(input)
        if (isNaN(angle)) {
          new Notice('Invalid rotation angle')
          return
        }

        this.setNodesRotation(canvas, nodes, angle)
      })
    })

    if (nodes.some(node => normalizeAngle(node.getData().rotation ?? 0) !== 0)) {
      menu.addItem(item => {
        item.setTitle('Reset rotation')
        item.setIcon('undo-2')
        item.onClick(() => this.setNodesRotation(canvas, nodes, 0))
      })
    }

    menu.addSeparator()

    for (const option of CONTENT_ROTATION_OPTIONS) {
      menu.addItem(item => {
        item.setTitle(`Content rotation: ${option.label}`)
        item.setIcon(option.value === 0 ? 'ban' : 'rotate-cw')
        item.onClick(() => this.setNodesContentRotation(canvas, nodes, option.value))
      })
    }

    menu.addSeparator()
  }

  private rotateNodesBy(canvas: Canvas, nodes: CanvasNode[], deltaDeg: number) {
    for (const node of nodes) {
      const newRotation = normalizeAngle((node.getData().rotation ?? 0) + deltaDeg)
      node.setData({
        ...node.getData(),
        rotation: newRotation === 0 ? undefined : newRotation // Keep the canvas JSON clean
      })
    }

    // Single undo step for multi-node operations (node-styles pattern)
    canvas.pushHistory(canvas.getData())
  }

  private setNodesRotation(canvas: Canvas, nodes: CanvasNode[], angleDeg: number) {
    const rotation = normalizeAngle(angleDeg)

    for (const node of nodes) {
      node.setData({
        ...node.getData(),
        rotation: rotation === 0 ? undefined : rotation // Keep the canvas JSON clean
      })
    }

    canvas.pushHistory(canvas.getData())
  }

  private setNodesContentRotation(canvas: Canvas, nodes: CanvasNode[], contentRotation: 0 | 90 | 180 | 270) {
    for (const node of nodes) {
      node.setData({
        ...node.getData(),
        contentRotation: contentRotation === 0 ? undefined : contentRotation // Keep the canvas JSON clean
      })
    }

    canvas.pushHistory(canvas.getData())
  }

  private getRotationPresence(canvas: Canvas): boolean {
    const cached = this.rotationPresenceCache.get(canvas)
    if (cached !== undefined) return cached

    const hasRotation = [...canvas.nodes.values()]
      .some(node => normalizeAngle(node.getData().rotation ?? 0) !== 0)

    this.rotationPresenceCache.set(canvas, hasRotation)
    return hasRotation
  }

  /** All rotated containers (groups and open portals), outermost first (sorted by bbox area descending) */
  private getRotatedContainers(canvas: Canvas): RotatedContainer[] {
    return [...canvas.nodes.values()]
      .filter(node => this.isRotationContainer(node))
      .map(node => ({ node, rotation: normalizeAngle(node.getData().rotation ?? 0) }))
      .filter(({ rotation }) => rotation !== 0)
      .map(({ node, rotation }) => ({
        node,
        rotation,
        bbox: nodeBBox(node),
        center: { x: node.x + node.width / 2, y: node.y + node.height / 2 }
      }))
      .sort((a, b) =>
        (b.bbox.maxX - b.bbox.minX) * (b.bbox.maxY - b.bbox.minY) -
        (a.bbox.maxX - a.bbox.minX) * (a.bbox.maxY - a.bbox.minY)
      )
  }

  /** An open portal node (its nested notes are real nodes fully contained in the portal's bbox) */
  private isOpenPortal(node: CanvasNode): boolean {
    const data = node.getData() as CanvasFileNodeData
    return data.type === 'file' && data.portal === true && data.isPortalLoaded === true
  }

  /** Rotation containers: rotating them rigidly rotates every fully contained node with them */
  private isRotationContainer(node: CanvasNode): boolean {
    return node.getData().type === 'group' || this.isOpenPortal(node)
  }

  /**
   * The composed rigid transform of a node: outermost -> innermost rotated containers (each
   * around the container's own already-transformed center), then the node's own rotation around
   * its own (already container-transformed) center. Because the container frame and its members
   * receive the same rigid transform, members stay inside the rotated container.
   */
  private getNodeRotationInfo(canvas: Canvas, node: CanvasNode, rotatedContainers: RotatedContainer[]): { center: Position, angle: number } {
    const ownRotation = normalizeAngle(node.getData().rotation ?? 0)
    const bbox = nodeBBox(node)
    const containingContainers = rotatedContainers.filter(container => container.node !== node && BBoxHelper.insideBBox(bbox, container.bbox, true))

    let center: Position = { x: node.x + node.width / 2, y: node.y + node.height / 2 }
    let totalAngle = ownRotation

    const appliedSteps: { center: Position, angle: number }[] = []
    for (const container of containingContainers) {
      let containerCenter = container.center
      for (const step of appliedSteps) containerCenter = rotatePointAround(containerCenter, step.center, step.angle)
      appliedSteps.push({ center: containerCenter, angle: container.rotation })

      center = rotatePointAround(center, containerCenter, container.rotation)
      totalAngle += container.rotation
    }

    return { center, angle: normalizeAngle(totalAngle) }
  }

  private updateAllNodeTransforms(canvas: Canvas, rotatedContainers: RotatedContainer[]) {
    for (const node of canvas.nodes.values()) this.updateNodeTransform(canvas, node, rotatedContainers)
  }

  private updateNodeTransform(canvas: Canvas, node: CanvasNode, rotatedContainers: RotatedContainer[]) {
    const { center, angle } = this.getNodeRotationInfo(canvas, node, rotatedContainers)

    if (this.isVisuallyUnchanged(node, { center, angle })) {
      // Unrotated node: restore Obsidian's vanilla transform if we previously rewrote it,
      // so untouched nodes stay byte-identical to vanilla
      if (node.nodeEl.style.transform.includes('rotate('))
        node.nodeEl.style.transform = `translate(${node.x}px, ${node.y}px)`

      return
    }

    const tx = center.x - node.width / 2
    const ty = center.y - node.height / 2
    const transform = angle === 0
      ? `translate(${tx}px, ${ty}px)`
      : `translate(${tx}px, ${ty}px) rotate(${angle}deg)`

    if (node.nodeEl.style.transform !== transform) node.nodeEl.style.transform = transform
  }

  // Added by an LLM agent (all methods below in this section):
  // Viewport virtualization support - keep rotated nodes/edges attached while they are
  // visually inside the viewport, even though their data-space bbox is not.

  /** Whether the composed rigid transform leaves the node exactly where its data bbox is */
  private isVisuallyUnchanged(node: CanvasNode, info: { center: Position, angle: number }): boolean {
    return info.angle === 0 &&
      info.center.x === node.x + node.width / 2 &&
      info.center.y === node.y + node.height / 2
  }

  /** The axis-aligned bbox of a node's visual rectangle (its rect rotated around its composed center) */
  private getVisualNodeBBox(node: CanvasNode, info: { center: Position, angle: number }): BBox {
    const halfWidth = node.width / 2
    const halfHeight = node.height / 2

    return pointsBBox([
      { x: info.center.x - halfWidth, y: info.center.y - halfHeight },
      { x: info.center.x + halfWidth, y: info.center.y - halfHeight },
      { x: info.center.x + halfWidth, y: info.center.y + halfHeight },
      { x: info.center.x - halfWidth, y: info.center.y + halfHeight }
    ].map(corner => rotatePointAround(corner, info.center, info.angle)))
  }

  private onIntersectingNodesRequested(canvas: Canvas, bbox: BBox, nodes: CanvasNode[]) {
    if (!this.getRotationPresence(canvas)) return

    const rotatedContainers = this.getRotatedContainers(canvas)
    const included = new Set(nodes)

    for (const node of canvas.nodes.values()) {
      if (included.has(node)) continue

      const info = this.getNodeRotationInfo(canvas, node, rotatedContainers)
      if (this.isVisuallyUnchanged(node, info)) continue

      if (BBoxHelper.isColliding(this.getVisualNodeBBox(node, info), bbox)) nodes.push(node)
    }
  }

  private onIntersectingEdgesRequested(canvas: Canvas, bbox: BBox, edges: CanvasEdge[]) {
    if (!this.getRotationPresence(canvas)) return

    const rotatedContainers = this.getRotatedContainers(canvas)
    const included = new Set(edges)

    for (const edge of canvas.edges.values()) {
      if (included.has(edge)) continue

      const visualBBox = this.getVisualEdgeBBox(canvas, edge, rotatedContainers)
      if (visualBBox && BBoxHelper.isColliding(visualBBox, bbox)) edges.push(edge)
    }
  }

  /**
   * The axis-aligned bbox of an edge's visual path. If this extension re-anchored the edge,
   * its bezier points are already in visual space and the curve is contained in the convex
   * hull of its control points. Otherwise fall back to the combined visual bbox of both
   * endpoint nodes. Returns null if neither endpoint is rotated.
   */
  private getVisualEdgeBBox(canvas: Canvas, edge: CanvasEdge, rotatedContainers: RotatedContainer[]): BBox | null {
    const fromInfo = this.getNodeRotationInfo(canvas, edge.from.node, rotatedContainers)
    const toInfo = this.getNodeRotationInfo(canvas, edge.to.node, rotatedContainers)
    if (this.isVisuallyUnchanged(edge.from.node, fromInfo) && this.isVisuallyUnchanged(edge.to.node, toInfo)) return null

    if (this.rotatedEdges.has(edge) && edge.bezier)
      return pointsBBox([edge.bezier.from, edge.bezier.cp1, edge.bezier.cp2, edge.bezier.to])

    return BBoxHelper.combineBBoxes([
      this.getVisualNodeBBox(edge.from.node, fromInfo),
      this.getVisualNodeBBox(edge.to.node, toInfo)
    ])
  }

  /** Groups and open portals propagate their `contentRotation` to their content instead of rotating their own */
  private isContentRotationContainer(node: CanvasNode): boolean {
    return node.getData().type === 'group' || this.isOpenPortal(node)
  }

  /** The content rotation that applies to a node's own content: own + all containing containers' (cardinal stays cardinal) */
  private getEffectiveContentRotation(canvas: Canvas, node: CanvasNode): number {
    if (this.isContentRotationContainer(node)) return 0

    const bbox = nodeBBox(node)
    let total = node.getData().contentRotation ?? 0

    for (const other of canvas.nodes.values()) {
      if (other === node || !this.isContentRotationContainer(other)) continue

      const containerRotation = other.getData().contentRotation ?? 0
      if (containerRotation === 0) continue
      if (BBoxHelper.insideBBox(bbox, nodeBBox(other), true)) total += containerRotation
    }

    return normalizeAngle(total)
  }

  private applyContentRotationAttribute(element: HTMLElement, effectiveRotation: number) {
    if (effectiveRotation === 0) {
      if (element.dataset.contentRotation !== undefined) delete element.dataset.contentRotation
    } else if (element.dataset.contentRotation !== String(effectiveRotation)) {
      element.dataset.contentRotation = String(effectiveRotation)
    }
  }

  private updateAllContentRotationAttributes(canvas: Canvas) {
    for (const node of canvas.nodes.values())
      this.applyContentRotationAttribute(node.nodeEl, this.getEffectiveContentRotation(canvas, node))
  }

  /** Re-runs `updatePath` (which re-fires `edge-path-updated`) for every edge that is or was rotated */
  private refreshEdges(canvas: Canvas, rotatedContainers: RotatedContainer[]) {
    for (const edge of canvas.edges.values()) {
      if (!edge.initialized) continue

      const fromAngle = this.getNodeRotationInfo(canvas, edge.from.node, rotatedContainers).angle
      const toAngle = this.getNodeRotationInfo(canvas, edge.to.node, rotatedContainers).angle
      if (fromAngle !== 0 || toAngle !== 0 || this.rotatedEdges.has(edge)) edge.updatePath()
    }
  }

  /**
   * Re-anchors an edge Obsidian just recalculated: maps the bezier end/control points, the
   * border stubs and the arrow head positions from data space to on-screen space using each
   * connected node's composed rigid transform. Mirrors Obsidian's own `updatePath` geometry
   * (see obsidian.asar: `V5`/`z5`/`q5`).
   */
  private onEdgePathUpdated(canvas: Canvas, edge: CanvasEdge) {
    // The edge styles extension replaces the whole path of pathfinding edges after this hook
    if (edge.getData().styleAttributes?.pathfindingMethod) return
    if (!edge.bezier || !edge.path?.display) return

    const rotatedContainers = this.getRotatedContainers(canvas)
    const fromInfo = this.getNodeRotationInfo(canvas, edge.from.node, rotatedContainers)
    const toInfo = this.getNodeRotationInfo(canvas, edge.to.node, rotatedContainers)

    if (fromInfo.angle === 0 && toInfo.angle === 0) {
      this.rotatedEdges.delete(edge)
      return
    }

    const from = this.applyNodeRotation(edge.bezier.from, edge.from.node, fromInfo)
    const cp1 = this.applyNodeRotation(edge.bezier.cp1, edge.from.node, fromInfo)
    const to = this.applyNodeRotation(edge.bezier.to, edge.to.node, toInfo)
    const cp2 = this.applyNodeRotation(edge.bezier.cp2, edge.to.node, toInfo)
    const curve = `M${from.x},${from.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${to.x},${to.y}`

    Object.assign(edge.bezier, { from, cp1, to, cp2, path: curve })

    // Arrow heads sit on the (now rotated) node border, pointing along the rotated side normal;
    // an end without an arrow head gets a stub out to the border, same as Obsidian's own path
    let path = curve
    const fromBorder = this.applyNodeRotation(BBoxHelper.getCenterOfBBoxSide(edge.from.node.getBBox(), edge.from.side), edge.from.node, fromInfo)
    const toBorder = this.applyNodeRotation(BBoxHelper.getCenterOfBBoxSide(edge.to.node.getBBox(), edge.to.side), edge.to.node, toInfo)

    if (edge.fromLineEnd) {
      const arrowAngle = normalizeAngle(SIDE_ARROW_ANGLES[edge.from.side] + fromInfo.angle)
      edge.fromLineEnd.el.style.transform = `translate(${fromBorder.x}px, ${fromBorder.y}px) rotate(${arrowAngle}deg)`
    } else {
      path = `M${fromBorder.x} ${fromBorder.y} L${from.x} ${from.y} ${path}`
    }

    if (edge.toLineEnd) {
      const arrowAngle = normalizeAngle(SIDE_ARROW_ANGLES[edge.to.side] + toInfo.angle)
      edge.toLineEnd.el.style.transform = `translate(${toBorder.x}px, ${toBorder.y}px) rotate(${arrowAngle}deg)`
    } else {
      path = `${path} M${to.x} ${to.y} L${toBorder.x} ${toBorder.y}`
    }

    edge.path.interaction.setAttribute('d', path)
    edge.path.display.setAttribute('d', path)

    this.rotatedEdges.add(edge)
  }

  /**
   * Maps a point from a node's data space to its on-screen position: rotate around the node's
   * DATA center by the composed angle, then shift by how far the composed center moved.
   * (Rotating around the composed center directly is wrong for nodes inside rotated containers.)
   */
  private applyNodeRotation(point: Position, node: CanvasNode, info: { center: Position, angle: number }): Position {
    const dataCenter = { x: node.x + node.width / 2, y: node.y + node.height / 2 }
    const rotated = rotatePointAround(point, dataCenter, info.angle)

    return {
      x: rotated.x + info.center.x - dataCenter.x,
      y: rotated.y + info.center.y - dataCenter.y
    }
  }
}
