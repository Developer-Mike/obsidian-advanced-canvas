/* Added by an LLM agent */
import { Component, MarkdownRenderer } from "obsidian"
import { Canvas, CanvasEdge, CanvasEdgeLabelElement, CanvasView, Position } from "src/@types/Canvas"
import Patcher from "src/patchers/patcher"
import { isEmbedOnlyLabel } from "src/utils/edge-label-embed-helper"
import CanvasExtension from "./canvas-extension"

/** Set on the label while it shows rendered markdown instead of its raw source */
const RENDERED_CLASS = 'ac-markdown-label'

/**
 * Set on top of `RENDERED_CLASS` when the label contains content that has no intrinsic width
 * (embeds, code block widgets, tables, images). Those collapse to a few pixels inside the
 * label's shrink-to-fit box, so the label needs a definite width instead.
 */
const BLOCK_CONTENT_CLASS = 'ac-markdown-label-block'

const BLOCK_CONTENT_SELECTOR = '.internal-embed, .external-embed, [class*="block-language-"], table, img, iframe, video, canvas, .callout'

/** Consumed by `styles/edge-label-markdown.scss` */
const MAX_WIDTH_PROPERTY = '--ac-markdown-label-max-width'
const MAX_HEIGHT_PROPERTY = '--ac-markdown-label-max-height'

/**
 * Elements that should stay interactive inside a rendered label. A click on one of these
 * must not bubble to the core click handler on the label wrapper, because that handler
 * selects the edge / enters edit mode and would swallow the interaction.
 */
const INTERACTIVE_SELECTOR = 'a, .internal-embed, .external-embed, .task-list-item-checkbox, button, input, .callout-fold, .copy-code-button'

/**
 * Renders edge labels as markdown.
 *
 * The core label is a `contenteditable` div holding the raw label text. This extension swaps
 * that text for rendered markdown whenever the label isn't being edited, and swaps the raw
 * source back in before edit mode starts, so typing still edits the actual label string.
 */
export default class EdgeLabelMarkdownCanvasExtension extends CanvasExtension {
  isEnabled() { return 'edgeLabelMarkdownEnabled' as const }

  /** The label source that is currently rendered, per label - guards against redundant re-renders */
  private renderedSources = new WeakMap<CanvasEdgeLabelElement, string>()
  /** Owns the lifecycle of everything `MarkdownRenderer` created for a label (embeds, code blocks, ...) */
  private renderComponents = new WeakMap<CanvasEdgeLabelElement, Component>()
  /** The capture-phase click interceptor installed on a label wrapper */
  private clickInterceptors = new WeakMap<CanvasEdgeLabelElement, (event: MouseEvent) => void>()

  /** The core label class isn't exported, so its prototype gets patched lazily via the first instance */
  private labelPrototypePatched = false

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-added',
      (_canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-changed',
      (_canvas: Canvas, edge: CanvasEdge) => this.onEdgeChanged(edge)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-removed',
      (_canvas: Canvas, edge: CanvasEdge) => this.cleanupLabel(edge.labelElement)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-view-unloaded:before',
      (view: CanvasView) => {
        for (const edge of view.canvas.edges.values()) this.cleanupLabel(edge.labelElement)
      }
    ))

    // Switching the render mode (or the size limits) has to reach labels that are already
    // rendered - nothing else would invalidate them, because their source hasn't changed
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => {
        for (const canvas of this.plugin.getCanvases()) {
          for (const edge of canvas.edges.values()) {
            if (!edge.labelElement) continue

            this.renderedSources.delete(edge.labelElement)
            void this.renderMarkdown(edge.labelElement)
          }
        }
      }
    ))
  }

  private onEdgeChanged(edge: CanvasEdge) {
    const labelElement = edge.labelElement
    if (!labelElement) return

    this.patchLabelPrototype(labelElement)
    this.interceptClicks(labelElement)
    void this.renderMarkdown(labelElement)
  }

  /**
   * Edit mode and destruction aren't exposed as canvas events, so the core label class gets
   * patched directly. Patching happens once, on the prototype, so it covers every label.
   */
  private patchLabelPrototype(labelElement: CanvasEdgeLabelElement) {
    if (this.labelPrototypePatched) return
    this.labelPrototypePatched = true

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    Patcher.patchPrototype<CanvasEdgeLabelElement>(this.plugin, labelElement, {
      // Put the raw source back before the caret gets placed into the label
      focus: Patcher.OverrideExisting(next => function (position?: Position): void {
        that.showSource(this)
        next.call(this, position)
      }),

      // Re-render as soon as editing ends
      blur: Patcher.OverrideExisting(next => function (): void {
        next.call(this)
        void that.renderMarkdown(this)
      }),

      /**
       * Core calls this from `edge.render()` - unconditionally, on every render - and it writes
       * the raw label text straight into `textareaEl`. Left alone it wipes the rendered markdown
       * the next time anything re-renders the edge (a connected node moving, a style change, a
       * colour change), and the label stays raw until its source changes. So when the rendered
       * output for exactly this text is already in place, core's write is skipped entirely.
       */
      setText: Patcher.OverrideExisting(next => function (text: string): void {
        if (!this.isEditing && that.renderedSources.get(this) === text) return

        next.call(this, text)
        void that.renderMarkdown(this)
      }),

      destroy: Patcher.OverrideExisting(next => function (skipSave?: boolean): void {
        that.cleanupLabel(this)
        next.call(this, skipSave)
      })
    })
  }

  /**
   * The core click handler on the wrapper selects the edge or enters edit mode. Clicks on
   * links, embeds and other interactive content get stopped before they reach it - a capture
   * listener on the same element runs before the bubble listener core registered.
   */
  private interceptClicks(labelElement: CanvasEdgeLabelElement) {
    if (this.clickInterceptors.has(labelElement)) return

    const interceptor = (event: MouseEvent) => {
      if (labelElement.isEditing) return
      if (!labelElement.textareaEl.hasClass(RENDERED_CLASS)) return

      const target = event.target as HTMLElement | null
      if (!target?.closest?.(INTERACTIVE_SELECTOR)) return

      event.stopPropagation()
    }

    labelElement.wrapperEl.addEventListener('click', interceptor, { capture: true })
    this.clickInterceptors.set(labelElement, interceptor)
  }

  /**
   * Whether this label's source is one the current render mode handles. `embeds-only` limits
   * rendering to labels that are nothing but note embeds; everything else stays plain text.
   */
  private shouldRender(source: string): boolean {
    if (source.length === 0) return false
    if (this.plugin.settings.getSetting('edgeLabelMarkdownRenderMode') === 'full') return true

    return isEmbedOnlyLabel(source)
  }

  /** Replaces the label's content with rendered markdown (no-op while it's being edited) */
  private async renderMarkdown(labelElement: CanvasEdgeLabelElement) {
    if (labelElement.isEditing) return

    const source = labelElement.edge.label ?? ''
    if (this.renderedSources.get(labelElement) === source) return

    const textareaEl = labelElement.textareaEl

    if (!this.shouldRender(source)) {
      // Nothing to render - hand the label back to core, plain text and all. The source is
      // deliberately left out of `renderedSources` so core's own `setText` keeps working.
      this.unloadRenderComponent(labelElement)
      this.renderedSources.delete(labelElement)

      textareaEl.removeClass(RENDERED_CLASS)
      textareaEl.removeClass(BLOCK_CONTENT_CLASS)
      textareaEl.setText(source)
      return
    }

    this.renderedSources.set(labelElement, source)

    const component = this.resetRenderComponent(labelElement)
    textareaEl.empty()

    textareaEl.addClass(RENDERED_CLASS)
    textareaEl.style.setProperty(MAX_WIDTH_PROPERTY, `${this.plugin.settings.getSetting('edgeLabelMarkdownMaxWidth')}px`)
    textareaEl.style.setProperty(MAX_HEIGHT_PROPERTY, `${this.plugin.settings.getSetting('edgeLabelMarkdownMaxHeight')}px`)

    const sourcePath = labelElement.edge.canvas.view.file?.path ?? ''
    try {
      await MarkdownRenderer.render(this.plugin.app, source, textareaEl, sourcePath, component)
    } catch (error) {
      console.error('Advanced Canvas: failed to render an edge label as markdown', error)

      // Fall back to plain text, and give the source back so core's `setText` works again
      this.unloadRenderComponent(labelElement)
      this.renderedSources.delete(labelElement)

      textareaEl.removeClass(RENDERED_CLASS)
      textareaEl.removeClass(BLOCK_CONTENT_CLASS)
      textareaEl.setText(source)
      return
    }

    // The label may have been edited or destroyed while the markdown was rendering
    if (this.renderComponents.get(labelElement) !== component) return

    textareaEl.toggleClass(BLOCK_CONTENT_CLASS, textareaEl.querySelector(BLOCK_CONTENT_SELECTOR) !== null)
  }

  /** Puts the raw label source back so it can be edited as plain text */
  private showSource(labelElement: CanvasEdgeLabelElement) {
    this.unloadRenderComponent(labelElement)
    this.renderedSources.delete(labelElement)

    labelElement.textareaEl.removeClass(RENDERED_CLASS)
    labelElement.textareaEl.removeClass(BLOCK_CONTENT_CLASS)
    labelElement.textareaEl.setText(labelElement.edge.label ?? '')
  }

  private resetRenderComponent(labelElement: CanvasEdgeLabelElement): Component {
    this.unloadRenderComponent(labelElement)

    const component = new Component()
    this.renderComponents.set(labelElement, component)
    component.load()

    return component
  }

  private unloadRenderComponent(labelElement: CanvasEdgeLabelElement) {
    this.renderComponents.get(labelElement)?.unload()
    this.renderComponents.delete(labelElement)
  }

  private cleanupLabel(labelElement: CanvasEdgeLabelElement | null | undefined) {
    if (!labelElement) return

    this.unloadRenderComponent(labelElement)
    this.renderedSources.delete(labelElement)

    const interceptor = this.clickInterceptors.get(labelElement)
    if (interceptor) {
      labelElement.wrapperEl.removeEventListener('click', interceptor, { capture: true })
      this.clickInterceptors.delete(labelElement)
    }
  }
}
