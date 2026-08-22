import { Notice } from "obsidian"
import { Canvas, CanvasView } from "src/@types/Canvas"
import MigrationHelper, { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
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
    /* eslint-disable-next-line @typescript-eslint/no-deprecated -- It's my lint and I know the consequences */
    if (!canvas.data) return

    // Canvases fed through `Canvas.setData` directly (e.g. other plugins embedding a live,
    // interactive mini-canvas, such as Better Embedded Canvas) never pass through the patched
    // `CanvasFileView.setViewData`, so they skip migration entirely. Migrate here too instead of
    // just warning - `needsMigration`/`migrate` are no-ops for canvases that already migrated
    // (the normal, unpatched-view-loaded case), so this doesn't change existing behaviour there.
    if (MigrationHelper.needsMigration(canvas.data))
      canvas.data = MigrationHelper.migrate(canvas.data)

    const metadata = canvas.data.metadata
    if (!metadata || metadata.version !== CURRENT_SPEC_VERSION)
      return void new Notice("Metadata node not found or version mismatch. Should have been migrated (but wasn't).")

    // Add proxy to metadata to listen for changes
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    /* eslint-disable @typescript-eslint/no-explicit-any -- Generic wrapper */
    const validator: ProxyHandler<any> = {
      get(target: any, key: string): any {
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
    /* eslint-enable @typescript-eslint/no-explicit-any -- Generic wrapper */

    // Set canvas metadata
    canvas.metadata = new Proxy(metadata, validator)

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
