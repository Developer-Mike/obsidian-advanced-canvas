import { Canvas } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"
import CanvasHelper from "src/utils/canvas-helper"

export default class FrontmatterModalCanvasExtension extends CanvasExtension {
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
        icon: 'archive',
        label: 'Properties',
        callback: () => {
          console.log('Properties button clicked')
        }
      })
    )
  }
}