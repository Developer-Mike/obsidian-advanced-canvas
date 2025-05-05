import { Canvas, CanvasView } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
import { Notice } from "obsidian"

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

  private onCanvasChanged(canvas: Canvas) {
    let metadata = canvas.data?.metadata
    if (!metadata || metadata.version !== CURRENT_SPEC_VERSION)
      return new Notice("Metadata node not found or version mismatch. Should have been migrated (but wasn't).")

    // Add proxy to metadata to listen for changes
    const that = this
    const validator = {
      get(target: any, key: string) {
        if (typeof target[key] === 'object' && target[key] !== null)
          return new Proxy(target[key], validator)
        else return target[key]
      },
      set(target: any, key: string, value: any) {
        target[key] = value

        that.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
        canvas.requestSave()

        return true
      }
    }

    // Set canvas metadata
    canvas.metadata = new Proxy(metadata, validator)

    // Trigger metadata change event
    this.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
  }

  private onMetadataChanged(canvas: Canvas) {
    // Remove old cssclasses
    if (this.canvasCssclassesCache.has(canvas.view))
      canvas.wrapperEl.classList.remove(...this.canvasCssclassesCache.get(canvas.view)!)

    // Set new cssclasses
    const currentClasses = canvas.metadata?.frontmatter?.cssclasses as string[] ?? []
    this.canvasCssclassesCache.set(canvas.view, currentClasses)

    if (currentClasses.length > 0) canvas.wrapperEl.classList.add(...currentClasses)
  }

  private onCanvasViewUnloaded(view: CanvasView) {
    this.canvasCssclassesCache.delete(view) // Remove the cssclasses cache for the view
  }
}