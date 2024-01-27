import { ItemView, Plugin } from 'obsidian'
import CommandHelper from './command-helper'
import CanvasModifier from './canvas-modifier'

export default class AdvancedCanvasPlugin extends Plugin {
  commandHelper: CommandHelper
  canvasModifier: CanvasModifier

	async onload() {
    this.commandHelper = new CommandHelper(this)
    this.canvasModifier = new CanvasModifier(this)
	}

  onunload() {
    this.canvasModifier?.destroy()
  }

  getCurrentCanvas(): any {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView)
		if (canvasView?.getViewType() !== 'canvas') return null

    return (canvasView as any).canvas
  }
}