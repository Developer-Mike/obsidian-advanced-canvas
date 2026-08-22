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
  { setting: 'defaultArrowSize', datasetKey: 'defaultArrowSize' },
  // Solid is Obsidian's own border, so it needs its own "leave it alone" value
  { setting: 'defaultNodeBorder', datasetKey: 'defaultNodeBorder', unchangedValue: 'default' }
]

/** The value of a setting that leaves the size at Obsidian's own default */
const UNCHANGED_SIZE = '1'

/** Consumed by `styles/default-style-sizes.scss` */
const CARD_PADDING_H_PROPERTY = '--ac-card-padding-h'
const CARD_PADDING_V_PROPERTY = '--ac-card-padding-v'

// Added by an LLM agent
/**
 * Newer Obsidian builds expose `--canvas-color` as a full color and tint groups/labels with
 * `color-mix(in oklch, var(--canvas-color) …)`, while older ones (e.g. the mobile bundle
 * obsidian-web runs in the browser) expose it as an `r, g, b` triplet for
 * `rgba(var(--canvas-color), …)`. A declaration built for the wrong shape is invalid at
 * computed-value time and computes to `unset` (transparent fills), so the styles key each
 * shape on a wrapper attribute instead of relying on declaration fallbacks.
 *
 * Detected once from Obsidian's own group tint rule (checked on the main document - app.css is
 * guaranteed to be loaded there) and cached; the build doesn't change mid-session.
 */
let canvasColorTriplet: boolean | null = null

function canvasColorFormatIsTriplet(): boolean {
  if (canvasColorTriplet !== null) return canvasColorTriplet

  canvasColorTriplet = false
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSGroupingRule) walk(rule.cssRules)
      else if (rule instanceof CSSStyleRule
        && (rule.selectorText === '.canvas-node-group .canvas-node-content'
          || rule.selectorText === '.canvas-node.is-themed .canvas-node-content'))
        canvasColorTriplet = rule.cssText.includes('rgba(var(--canvas-color)')
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules) } catch { continue } // Cross-origin sheets are unreadable
  }
  return canvasColorTriplet
}

/**
 * Exposes the configured default sizes on the canvas wrapper so that elements without an
 * explicit style attribute (`groupLabelSize`/`groupOpacity`/`edgeWidth`/`arrowSize`/`border`) can
 * be styled by CSS.
 *
 * A setting that is left at its unchanged value (1x for sizes, 'default' otherwise) doesn't get
 * exposed at all - the styles are keyed on the presence of the data attribute, so Obsidian's own
 * styling stays completely untouched then.
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

    // Card node padding (added by an LLM agent) - a continuous [horizontal, vertical] pixel
    // pair rather than a discrete preset, so it's exposed as CSS custom properties instead of
    // a dataset attribute. [16, 0] reproduces Obsidian's own default padding exactly.
    const [paddingHorizontal, paddingVertical] = this.plugin.settings.getSetting('cardNodePadding') as [number, number]
    wrapperEl.style.setProperty(CARD_PADDING_H_PROPERTY, `${paddingHorizontal}px`)
    wrapperEl.style.setProperty(CARD_PADDING_V_PROPERTY, `${paddingVertical}px`)

    // Added by an LLM agent - exposes the --canvas-color value shape; consumed by the group
    // opacity and boxed node label rules in node-styles.scss / default-style-sizes.scss
    if (canvasColorFormatIsTriplet()) wrapperEl.dataset.canvasColorFormat = 'triplet'
    else delete wrapperEl.dataset.canvasColorFormat
  }
}
