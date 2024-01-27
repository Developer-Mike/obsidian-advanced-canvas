import { ItemView, Plugin } from 'obsidian'
import CommandHelper from './command-helper'
import CanvasExtension from './canvas-extension'
import FlowchartCanvasExtension from './flowchart-canvas-extension'
import GroupCanvasExtension from './group-canvas-extension'

const CANVAS_EXTENSIONS: typeof CanvasExtension[] = [
  GroupCanvasExtension,
  FlowchartCanvasExtension,
]

export default class AdvancedCanvasPlugin extends Plugin {
  commandHelper: CommandHelper
  canvasExtensions: CanvasExtension[]

	async onload() {
    this.commandHelper = new CommandHelper(this)

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