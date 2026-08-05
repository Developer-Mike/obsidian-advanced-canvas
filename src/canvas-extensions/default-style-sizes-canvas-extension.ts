/* Added by an LLM agent */
import { Canvas } from "src/@types/Canvas"
import { AdvancedCanvasPluginSettingsValues } from "src/settings"
import CanvasExtension from "./canvas-extension"

/**
 * The settings holding the default value of a style attribute and the data attribute they get
 * exposed as on the canvas wrapper. The values themselves are applied in
 * `styles/default-style-sizes.scss`.
 */
const DEFAULT_SIZE_SETTINGS: { setting: keyof AdvancedCanvasPluginSettingsValues, datasetKey: string, unchangedValue?: string }[] = [
  { setting: 'defaultGroupLabelSize', datasetKey: 'defaultGroupLabelSize' },
  // 1 means a solid fill for the opacity, so it needs its own "leave it alone" value
  { setting: 'defaultGroupOpacity', datasetKey: 'defaultGroupOpacity', unchangedValue: 'default' },
  { setting: 'defaultEdgeWidth', datasetKey: 'defaultEdgeWidth' },
  { setting: 'defaultArrowSize', datasetKey: 'defaultArrowSize' }
]

/** The value of a setting that leaves the size at Obsidian's own default */
const UNCHANGED_SIZE = '1'

/**
 * Exposes the configured default sizes on the canvas wrapper so that elements without an
 * explicit style attribute (`groupLabelSize`/`groupOpacity`/`edgeWidth`/`arrowSize`) can be
 * styled by CSS.
 *
 * A setting that is left at 1x doesn't get exposed at all - the styles are keyed on the
 * presence of the data attribute, so Obsidian's own sizing stays completely untouched then.
 */
export default class DefaultStyleSizesCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed',
      () => {
        for (const canvas of this.plugin.getCanvases())
          this.updateDefaultSizes(canvas)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.updateDefaultSizes(canvas)
    ))
  }

  private updateDefaultSizes(canvas: Canvas) {
    const wrapperEl = canvas.wrapperEl
    if (!wrapperEl) return

    for (const { setting, datasetKey, unchangedValue } of DEFAULT_SIZE_SETTINGS) {
      const value = this.plugin.settings.getSetting(setting) as string

      if (value === (unchangedValue ?? UNCHANGED_SIZE)) delete wrapperEl.dataset[datasetKey]
      else wrapperEl.dataset[datasetKey] = value
    }
  }
}
