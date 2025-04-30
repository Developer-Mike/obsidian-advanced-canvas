import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import { CURRENT_SPEC_VERSION } from "src/utils/migration-helper"
import { Notice } from "obsidian"

export default class MetadataCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  private onCanvasChanged(canvas: Canvas) {
    let metadata = canvas.data?.metadata
    let canvasVersion = metadata?.version // Save version before adding default metadata

    if (!metadata || canvasVersion !== CURRENT_SPEC_VERSION)
      return new Notice("Metadata node not found or version mismatch. Should have been migrated (but wasn't).")

    // Set canvas metadata
    canvas.metadata = metadata
    canvas.getMetadata = this.getMetadata.bind(canvas)
    canvas.setMetadata = this.setMetadata.bind(canvas)

    // Trigger metadata change event
    this.plugin.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', canvas)
  }

  private getMetadata(this: Canvas, key: string) {
    if (!this.metadata) return console.error('Metadata not found')
    return this.metadata[key as keyof typeof this.metadata]
  }

  private setMetadata(this: Canvas, key: string, value: any) {
    if (!this.metadata) return console.error('Metadata not found')

    this.metadata[key as keyof typeof this.metadata] = value
    this.app.workspace.trigger('advanced-canvas:canvas-metadata-changed', this)
  }
}