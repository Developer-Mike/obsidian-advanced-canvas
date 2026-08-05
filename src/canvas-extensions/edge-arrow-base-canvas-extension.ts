/* Added by an LLM agent */
import { Side } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasEdge, Position } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasExtension from "./canvas-extension"

/**
 * How far the triangle arrow head reaches back from its tip before any scaling - the `y` of the
 * two back corners of the `0,0 6.5,10.4 -6.5,10.4` polygon (see
 * `EdgeStylesExtension.getArrowPolygonPoints`).
 */
const TRIANGLE_ARROW_LENGTH = 10.4

/**
 * The arrow styles whose back edge sits at `TRIANGLE_ARROW_LENGTH`. Every other style (diamonds,
 * circles, ...) is left alone, because the line has to reach a different distance into it.
 * `undefined`/`null` is Obsidian's own arrow head, which is the same triangle.
 */
const TRIANGLE_ARROW_STYLES: (string | undefined | null)[] = [undefined, null, 'triangle', 'triangle-outline']

/** How far in front of the node border Obsidian ends an edge path that has an arrow head */
const DEFAULT_PATH_END_OFFSET = 7

/**
 * The share of the distance between the two node borders the ends may be pulled back by in total.
 * Zoomed far out an arrow head can be longer than a short edge, and pulling both ends back that
 * far would turn the path inside out - such edges fall back towards Obsidian's own geometry
 * instead.
 */
const MAX_TOTAL_OFFSET_RATIO = 0.45

/** The unit vector pointing away from the node, out of the middle of the given side */
function getOutwardSideVector(side: Side): Position {
  switch (side) {
    case 'top': return { x: 0, y: -1 }
    case 'right': return { x: 1, y: 0 }
    case 'bottom': return { x: 0, y: 1 }
    case 'left': return { x: -1, y: 0 }
  }
}

function movedAlong(position: Position, direction: Position, distance: number): Position {
  return { x: position.x + direction.x * distance, y: position.y + direction.y * distance }
}

/**
 * Makes an edge end at the back of its arrow head instead of at the node border.
 *
 * Obsidian ends every edge path 7 units in front of the node border and then puts the arrow head
 * on the border itself, pointing along the side's normal. An arrow head reaches much further back
 * than those 7 units (even more so once the arrow size feature enlarges it), so a line that
 * arrives at an angle passes the arrow's back edge well off to one side of it and only then runs
 * out - the arrow ends up looking stuck to the line off-centre. Aiming the path at the middle of
 * the back edge instead makes the line meet the arrow head centred, whatever direction it comes
 * from.
 *
 * Only the two ends of the path are moved; the arrow heads themselves stay exactly where Obsidian
 * put them. Because an arrow head's size in canvas units depends on the zoom level, the paths are
 * also recalculated whenever the viewport settles at a new zoom.
 */
export default class EdgeArrowBaseCanvasExtension extends CanvasExtension {
  private pendingZoomRefreshes = new Map<Canvas, number>()
  private appliedZoomMultipliers = new WeakMap<Canvas, number>()

  isEnabled() { return true }

  init() {
    this.plugin.register(() => {
      for (const frame of this.pendingZoomRefreshes.values()) window.cancelAnimationFrame(frame)
      this.pendingZoomRefreshes.clear()
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-path-updated',
      (canvas: Canvas, edge: CanvasEdge) => this.onEdgePathUpdated(canvas, edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:viewport-changed:after',
      (canvas: Canvas) => this.scheduleZoomRefresh(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => {
        for (const canvas of this.plugin.getCanvases()) this.rerenderEdges(canvas)
      }
    ))
  }

  /**
   * Moves the ends of the path Obsidian just calculated out to the middle of the back edge of the
   * arrow heads. The control points move along with them, so the curve keeps its shape and still
   * meets the arrow head from the same direction.
   *
   * Runs on every `updatePath`, which includes the one the edge styles extension does before it
   * builds a pathfinding path - those read the updated `bezier` and end up at the arrow base too.
   */
  private onEdgePathUpdated(canvas: Canvas, edge: CanvasEdge) {
    if (!this.plugin.settings.getSetting('connectEdgesToArrowBase')) return
    if (!edge.bezier || !edge.path?.display) return

    const arrowLength = this.getArrowLength(canvas, edge)
    if (arrowLength === null) return

    // An arrow head shorter than Obsidian's own offset would need the line to grow instead
    const offset = Math.max(0, arrowLength - DEFAULT_PATH_END_OFFSET)
    if (offset === 0) return

    const fromBorder = BBoxHelper.getCenterOfBBoxSide(edge.from.node.getBBox(), edge.from.side)
    const toBorder = BBoxHelper.getCenterOfBBoxSide(edge.to.node.getBBox(), edge.to.side)

    const endCount = (edge.fromLineEnd ? 1 : 0) + (edge.toLineEnd ? 1 : 0)
    if (endCount === 0) return

    const span = Math.hypot(toBorder.x - fromBorder.x, toBorder.y - fromBorder.y)
    const cappedOffset = Math.min(offset, (span * MAX_TOTAL_OFFSET_RATIO) / endCount)

    const fromOffset = edge.fromLineEnd ? cappedOffset : 0
    const toOffset = edge.toLineEnd ? cappedOffset : 0

    const fromAxis = getOutwardSideVector(edge.from.side)
    const toAxis = getOutwardSideVector(edge.to.side)

    const from = movedAlong(edge.bezier.from, fromAxis, fromOffset)
    const cp1 = movedAlong(edge.bezier.cp1, fromAxis, fromOffset)
    const to = movedAlong(edge.bezier.to, toAxis, toOffset)
    const cp2 = movedAlong(edge.bezier.cp2, toAxis, toOffset)
    const curve = `M${from.x},${from.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${to.x},${to.y}`

    Object.assign(edge.bezier, { from, cp1, to, cp2, path: curve })

    // Same as Obsidian's own path: an end without an arrow head gets a stub out to the node border
    let path = curve
    if (!edge.fromLineEnd) path = `M${fromBorder.x} ${fromBorder.y} L${from.x} ${from.y} ${path}`
    if (!edge.toLineEnd) path = `${path} M${to.x} ${to.y} L${toBorder.x} ${toBorder.y}`

    edge.path.interaction.setAttribute('d', path)
    edge.path.display.setAttribute('d', path)
  }

  /** How far the edge's arrow heads reach back in canvas units, or null if they aren't triangles */
  private getArrowLength(canvas: Canvas, edge: CanvasEdge): number | null {
    // Without the edge styles feature the style attributes are ignored, so every arrow head is
    // Obsidian's own triangle at the default size
    const styleAttributes = this.plugin.settings.getSetting('edgesStylingFeatureEnabled')
      ? edge.getData()?.styleAttributes
      : undefined

    if (!TRIANGLE_ARROW_STYLES.includes(styleAttributes?.arrow)) return null

    // Mirrors the arrow size feature's `--arrow-size-multiplier`/`--default-arrow-size-multiplier`
    // (see styles/edge-styles.scss and styles/default-style-sizes.scss)
    const arrowSize = Number.parseFloat(
      String(styleAttributes?.arrowSize ?? this.plugin.settings.getSetting('defaultArrowSize'))
    ) || 1

    return TRIANGLE_ARROW_LENGTH * this.getZoomMultiplier(canvas) * arrowSize
  }

  /** The `--zoom-multiplier` Obsidian scales the arrow polygon (and everything else) by */
  private getZoomMultiplier(canvas: Canvas): number {
    const zoomMultiplier = Number.parseFloat(canvas.wrapperEl?.style.getPropertyValue('--zoom-multiplier'))
    return Number.isFinite(zoomMultiplier) && zoomMultiplier > 0
      ? zoomMultiplier
      : Math.sqrt(1 / Math.pow(2, canvas.zoom))
  }

  /**
   * Recalculates the paths once the viewport has come to rest, if zooming changed how long the
   * arrow heads are. `--zoom-multiplier` is only written when the viewport animation finishes, so
   * there is nothing to read (and nothing worth recalculating) while it is still moving - hence
   * waiting it out frame by frame.
   */
  private scheduleZoomRefresh(canvas: Canvas) {
    if (this.pendingZoomRefreshes.has(canvas)) return

    const waitForViewport = () => {
      if (!canvas.canvasEl?.isConnected) {
        this.pendingZoomRefreshes.delete(canvas)
        return
      }

      if (canvas.viewportChanged) {
        this.pendingZoomRefreshes.set(canvas, window.requestAnimationFrame(waitForViewport))
        return
      }

      this.pendingZoomRefreshes.delete(canvas)

      const zoomMultiplier = this.getZoomMultiplier(canvas)
      if (zoomMultiplier === this.appliedZoomMultipliers.get(canvas)) return
      this.appliedZoomMultipliers.set(canvas, zoomMultiplier)

      this.rerenderEdges(canvas)
    }

    this.pendingZoomRefreshes.set(canvas, window.requestAnimationFrame(waitForViewport))
  }

  /**
   * Queues a redraw of every edge that is currently on screen - the rest gets drawn on its way in.
   *
   * Marking them dirty rather than calling `render` directly is what the edge styles extension
   * expects: it only rebuilds a pathfinding path for edges in `canvas.dirty`, so a bare `render`
   * would drop the path back to the default bezier.
   */
  private rerenderEdges(canvas: Canvas) {
    for (const edge of canvas.edges.values()) {
      if (edge.initialized && edge.path?.display.isConnected) canvas.markDirty(edge)
    }
  }
}
