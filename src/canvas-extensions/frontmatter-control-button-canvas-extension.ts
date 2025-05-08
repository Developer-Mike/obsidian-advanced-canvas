import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import CanvasHelper from "src/utils/canvas-helper"
import { Notice } from "obsidian"

export default class FrontmatterControlButtonCanvasExtension extends CanvasExtension {
  isEnabled() { return 'canvasMetadataCompatibilityEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.addQuickSettings(canvas)
    ))
  }

  private addQuickSettings(canvas: Canvas) {
    if (!canvas) return
    
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    CanvasHelper.addControlMenuButton(
      settingsContainer,
      CanvasHelper.createControlMenuButton({
        id: 'properties-button',
        icon: 'info',
        label: 'Properties',
        callback: () => {
          const propertiesPlugin = this.plugin.app.internalPlugins.plugins['properties']
          if (!propertiesPlugin?._loaded) {
            new Notice(`Core plugin "Properties" was not found or isn't enabled.`)
            return
          }

          // Get or create the properties view
          let propertiesLeaf = this.plugin.app.workspace.getLeavesOfType('file-properties').first() ?? null
          if (!propertiesLeaf) {
            propertiesLeaf = this.plugin.app.workspace.getRightLeaf(false)
            propertiesLeaf?.setViewState({ type: 'file-properties' })
          }

          // Reveal the properties view
          if (propertiesLeaf) this.plugin.app.workspace.revealLeaf(propertiesLeaf)
        }
      })
    )
  }
}