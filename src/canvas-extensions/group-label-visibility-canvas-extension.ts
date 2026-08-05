/* Added by an LLM agent */
import { Notice } from "obsidian"
import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

/**
 * Toggles the visibility of every group label. The actual hiding is done in
 * `styles/group-label-visibility.scss`, driven by the `hideGroupLabels` setting that gets
 * exposed on the canvas wrapper by `dataset-exposers/canvas-wrapper-exposer.ts`.
 */
export default class GroupLabelVisibilityCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.addCommand({
      id: 'toggle-group-label-visibility',
      name: 'Toggle group label visibility',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (_canvas: Canvas) => this.toggleGroupLabelVisibility()
      )
    })
  }

  private toggleGroupLabelVisibility() {
    const hidden = !this.plugin.settings.getSetting('hideGroupLabels')
    void this.plugin.settings.setSetting({ hideGroupLabels: hidden })

    new Notice(hidden ? 'Group labels hidden' : 'Group labels visible')
  }
}
