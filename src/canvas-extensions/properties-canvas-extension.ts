import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/canvas-events"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../core/canvas-extension"
import { FrontmatterEvent } from "src/core/frontmatter-events"
import { FrontMatterCache } from "obsidian"

export default class PropertiesCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      FrontmatterEvent.FrontmatterChanged,
      (path: string, frontmatter: FrontMatterCache) => {
        const canvas = this.plugin.getCurrentCanvas()
        if (!canvas || path !== canvas.view.file.path) return
    
        this.onCanvasFrontmatterChanged(canvas, frontmatter)
      }
    ))
  }

  private async onCanvasChanged(canvas: Canvas) {
    this.addPropertiesButton(canvas)

    const frontmatterFile = await this.plugin.app.fileManager.getCanvasFrontmatterFile(canvas.view.file)

    let frontmatter: FrontMatterCache = {}
    if (frontmatterFile) frontmatter = this.plugin.app.metadataCache.getFileCache(frontmatterFile)?.frontmatter ?? {}

    this.onCanvasFrontmatterChanged(canvas, frontmatter)
  }

  private frontmatter: FrontMatterCache = {}
  private onCanvasFrontmatterChanged(canvas: Canvas, frontmatter: FrontMatterCache) {
    this.frontmatter = frontmatter

    // Handle special frontmatter properties
    this.updateCssClasses(canvas)
  }

  private previousCssclasses: string[] = []
  private updateCssClasses(canvas: Canvas) {
    this.previousCssclasses.forEach((cssclass) => {
      canvas.wrapperEl.classList.remove(cssclass)
    })

    this.previousCssclasses = this.frontmatter.cssclasses || []
    this.previousCssclasses.forEach((cssclass) => {
      canvas.wrapperEl.classList.add(cssclass)
    })
  }

  private addPropertiesButton(canvas: Canvas) {
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    CanvasHelper.addControlMenuButton(
      settingsContainer,
      CanvasHelper.createControlMenuButton({
        id: 'properties',
        label: 'Properties',
        icon: 'settings-2',
        callback: () => this.openPropertiesDialog(canvas)
      })
    )
  }

  private openPropertiesDialog(canvas: Canvas) {
    // TODO: Implement
  }
}