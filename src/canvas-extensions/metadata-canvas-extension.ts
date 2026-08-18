import { Notice } from "obsidian"
import { Canvas, CanvasView } from "src/@types/Canvas"
import { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
import CanvasExtension from "./canvas-extension"

export default class MetadataCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  private canvasCssclassesCache: Map<CanvasView, string[]> = new Map()

  init(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-metadata-changed',
      (canvas: Canvas) => this.onMetadataChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-view-unloaded:before',
      (view: CanvasView) => this.onCanvasViewUnloaded(view)
    ))
  }

  private onCanvasChanged(canvas: Canvas): void {
    const metadata = canvas.getData()?.metadata
    if (!metadata || metadata.version !== CURRENT_SPEC_VERSION)
      return void new Notice("Metadata node not found or version mismatch. Should have been migrated (but wasn't).")

    // Add proxy to metadata to listen for changes
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    const validator: ProxyHandler<Record<string, unknown>> = {
      get(target: Record<string, unknown>, key: string): unknown {
        if (typeof target[key] === 'object' && target[key] !== null)
          return new Proxy(target[key] as Record<string, unknown>, validator)
        else return target[key]
      },
      set(target: Record<string, unknown>, key: string, value: unknown) {
        target[key] = value

        that.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
        canvas.requestSave()

        return true
      }
    }

    // Set canvas metadata
    canvas.metadata = new Proxy(metadata as unknown as Record<string, unknown>, validator) as unknown as typeof metadata

    // Trigger metadata change event
    this.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
  }

  private onMetadataChanged(canvas: Canvas) {
    // Remove old cssclasses
    const oldCssClasses = this.canvasCssclassesCache.get(canvas.view)
    if (oldCssClasses) canvas.wrapperEl.classList.remove(...oldCssClasses)

    // Set new cssclasses
    const currentClasses = canvas.metadata?.frontmatter?.cssclasses as string[] ?? []
    this.canvasCssclassesCache.set(canvas.view, currentClasses)

    if (currentClasses.length > 0) canvas.wrapperEl.classList.add(...currentClasses)
  }

  private onCanvasViewUnloaded(view: CanvasView) {
    this.canvasCssclassesCache.delete(view) // Remove the cssclasses cache for the view
  }
}
