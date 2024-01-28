import { ItemView, Plugin } from 'obsidian'
import CanvasExtension from './canvas-extensions/canvas-extension'
import FlowchartCanvasExtension from './canvas-extensions/flowchart-canvas-extension'
import GroupCanvasExtension from './canvas-extensions/group-canvas-extension'
import PresentationCanvasExtension from './canvas-extensions/presentation-canvas-extension'

const CANVAS_EXTENSIONS: typeof CanvasExtension[] = [
  GroupCanvasExtension,
  PresentationCanvasExtension,
  FlowchartCanvasExtension,
]

export default class AdvancedCanvasPlugin extends Plugin {
  canvasExtensions: CanvasExtension[]

	async onload() {
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