import { ItemView, Plugin } from 'obsidian'
import CanvasExtension from './canvas-extensions/canvas-extension'
import FlowchartCanvasExtension from './canvas-extensions/flowchart-canvas-extension'
import GroupCanvasExtension from './canvas-extensions/group-canvas-extension'
import PresentationCanvasExtension from './canvas-extensions/presentation-canvas-extension'
import AdvancedCanvasSettingTab from './settings'
import AdvancedCanvasSettingsManager from './settings'

const CANVAS_EXTENSIONS: typeof CanvasExtension[] = [
  GroupCanvasExtension,
  PresentationCanvasExtension,
  FlowchartCanvasExtension,
]

export default class AdvancedCanvasPlugin extends Plugin {
  settingsManager: AdvancedCanvasSettingsManager
  canvasExtensions: CanvasExtension[]

	async onload() {
    this.settingsManager = new AdvancedCanvasSettingsManager(this)
    this.settingsManager.loadSettings()
    this.settingsManager.addSettingsTab()

    // @ts-ignore
    this.canvasExtensions = CANVAS_EXTENSIONS.map((Extension) => new Extension(this))
	}

  onunload() {
    this.canvasExtensions.forEach((extension) => extension.destroy())
  }

  getCurrentCanvas(): any {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView)
		if (canvasView?.getViewType() !== 'canvas') return null

    return (canvasView as any).canvas
  }
}