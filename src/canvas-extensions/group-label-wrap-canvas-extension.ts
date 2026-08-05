/* Added by an LLM agent */
import { CanvasGroupNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasNode, CanvasView } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

/**
 * The width of a wrapped group label, in unscaled pixels.
 * Consumed by `styles/group-label-wrap.scss`.
 */
const LABEL_WIDTH_PROPERTY = '--wrapped-group-label-width'

/**
 * A group label is absolutely positioned, so its width is shrink-to-fit:
 * `min(max-content, max-width)`. As soon as the text is too long for the group, that
 * evaluates to `max-width` - the label keeps the full allowed width even though the
 * wrapped lines are shorter than that, which leaves visible empty space next to the text.
 *
 * The width of the longest wrapped line can't be expressed in CSS, so it gets measured
 * here and applied as a custom property.
 */
export default class GroupLabelWrapCanvasExtension extends CanvasExtension {
  isEnabled() { return 'wrapGroupLabels' as const }

  /** The last `--zoom-multiplier` a canvas' labels were measured at */
  private lastZoomMultipliers = new WeakMap<Canvas, string>()
  private zoomObservers = new Map<Canvas, MutationObserver>()

  init() {
    this.plugin.register(() => this.stopObservingZoom())

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.observeZoom(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-view-unloaded:before',
      (view: CanvasView) => this.stopObservingZoom(view.canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-rendered',
      (_canvas: Canvas, node: CanvasNode) => this.updateLabelWidth(node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (_canvas: Canvas, node: CanvasNode) => this.updateLabelWidth(node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (_canvas: Canvas, node: CanvasNode) => this.updateLabelWidth(node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (_canvas: Canvas, node: CanvasNode, _isEditing: boolean) => this.updateLabelWidth(node)
    ))
  }

  /**
   * The label font size and its maximum width both scale with `--zoom-multiplier`, so where
   * the text wraps changes while zooming out. The viewport events fire before the multiplier
   * gets applied to the wrapper, so the wrapper itself gets watched instead.
   */
  private observeZoom(canvas: Canvas) {
    this.stopObservingZoom(canvas)

    const observer = new MutationObserver(() => this.onZoomChanged(canvas))
    observer.observe(canvas.wrapperEl, { attributes: true, attributeFilter: ['style'] })
    this.zoomObservers.set(canvas, observer)

    this.onZoomChanged(canvas)
  }

  private stopObservingZoom(canvas?: Canvas) {
    const canvases = canvas ? [canvas] : [...this.zoomObservers.keys()]

    for (const canvasToStop of canvases) {
      this.zoomObservers.get(canvasToStop)?.disconnect()
      this.zoomObservers.delete(canvasToStop)
    }
  }

  private onZoomChanged(canvas: Canvas) {
    const zoomMultiplier = canvas.wrapperEl.style.getPropertyValue('--zoom-multiplier')
    if (this.lastZoomMultipliers.get(canvas) === zoomMultiplier) return
    this.lastZoomMultipliers.set(canvas, zoomMultiplier)

    for (const node of canvas.getViewportNodes()) this.updateLabelWidth(node)
  }

  private updateLabelWidth(node: CanvasNode) {
    const labelEl = node.labelEl
    if (!labelEl) return

    const nodeData = node.getData() as CanvasGroupNodeData
    if (nodeData.type !== 'group') return

    // Measure the natural (shrink-to-fit) layout
    labelEl.style.removeProperty(LABEL_WIDTH_PROPERTY)
    if (nodeData.collapsed) return

    const naturalWidth = labelEl.offsetWidth
    if (naturalWidth === 0) return

    const lineRects = this.getLineRects(labelEl)
    if (lineRects.length <= 1) return // Not wrapped - shrink-to-fit is already correct

    // The label is scaled by the canvas' zoom, but the width gets applied unscaled
    const scale = labelEl.getBoundingClientRect().width / naturalWidth
    if (!scale) return

    const longestLineWidth = Math.max(...lineRects.map(rect => rect.width)) / scale
    // Round up so that no line gets pushed into another wrap by a subpixel difference
    const width = Math.ceil(longestLineWidth) + 1 + this.getHorizontalSpacing(labelEl)

    labelEl.style.setProperty(LABEL_WIDTH_PROPERTY, `${width}px`)
  }

  /** One rect per line box of the label's text */
  private getLineRects(labelEl: HTMLElement) {
    const range = labelEl.ownerDocument.createRange()
    range.selectNodeContents(labelEl)

    return Array.from(range.getClientRects())
  }

  /** The part of the label's width that isn't taken up by the text itself */
  private getHorizontalSpacing(labelEl: HTMLElement) {
    const style = getComputedStyle(labelEl)
    if (style.boxSizing !== 'border-box') return 0

    const borderWidth = labelEl.offsetWidth - labelEl.clientWidth
    return borderWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  }
}
