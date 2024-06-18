import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import SettingsManager from "src/settings"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

export default class BetterDefaultSettingsCanvasExtension  extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      SettingsManager.SETTINGS_CHANGED_EVENT,
      () => this.applySettings(this.plugin.getCurrentCanvas())
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.applySettings(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.DoubleClick,
      (canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) => this.onDoubleClick(canvas, event, preventDefault)
    ))

    this.applySettings(this.plugin.getCurrentCanvas())
  }

  private applySettings(canvas: Canvas | null) {
    if (!canvas) return

    canvas.config.defaultTextNodeDimensions = {
      width: this.plugin.settings.getSetting('defaultTextNodeWidth'),
      height: this.plugin.settings.getSetting('defaultTextNodeHeight')
    }

    canvas.config.defaultFileNodeDimensions = {
      width: this.plugin.settings.getSetting('defaultFileNodeWidth'),
      height: this.plugin.settings.getSetting('defaultFileNodeHeight')
    }
  }

  private async onDoubleClick(canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) {
    if (event.defaultPrevented || event.target !== canvas.wrapperEl || canvas.isDragging || canvas.readonly) return
    preventDefault.value = true

    var pos = canvas.posFromEvt(event)

    switch (this.plugin.settings.getSetting('nodeTypeOnDoubleClick')) {
      case 'file':
        const file = await new FileSelectModal(this.plugin.app, undefined, true).awaitInput()

        canvas.createFileNode({
          pos: pos,
          position: 'center',
          file: file
        })

        break
      default:
        canvas.createTextNode({
          pos: pos,
          position: 'center'
        })

        break
    }
  }
}