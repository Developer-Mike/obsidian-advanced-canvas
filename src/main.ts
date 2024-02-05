import { ItemView, Plugin } from 'obsidian'
import CanvasExtension from './canvas-extensions/canvas-extension'
import ShapesCanvasExtension from './canvas-extensions/shapes-canvas-extension'
import GroupCanvasExtension from './canvas-extensions/group-canvas-extension'
import PresentationCanvasExtension from './canvas-extensions/presentation-canvas-extension'
import AdvancedCanvasSettingsManager from './settings'
import InteractionTaggerCanvasExtension from './canvas-extensions/interaction-tagger-canvas-extension'

const CANVAS_EXTENSIONS: typeof CanvasExtension[] = [
  InteractionTaggerCanvasExtension,
  GroupCanvasExtension,
  PresentationCanvasExtension,
  ShapesCanvasExtension,
]

export default class AdvancedCanvasPlugin extends Plugin {
  settingsManager: AdvancedCanvasSettingsManager
  canvasExtensions: CanvasExtension[]

	async onload() {
    this.settingsManager = new AdvancedCanvasSettingsManager(this)
    await this.settingsManager.loadSettings()
    this.settingsManager.addSettingsTab()

    // @ts-ignore
    this.canvasExtensions = CANVAS_EXTENSIONS.map((Extension) => new Extension(this))
	}

  onunload() {}

  getCurrentCanvas(): any {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView)
		if (canvasView?.getViewType() !== 'canvas') return null

    return (canvasView as any).canvas
  }
}