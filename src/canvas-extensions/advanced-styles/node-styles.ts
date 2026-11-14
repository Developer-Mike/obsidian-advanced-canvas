import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../canvas-extension"
import { BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute, styleAttributeValidator } from "./style-config"
import CssStylesConfigManager from "src/managers/css-styles-config-manager"
import AdvancedCanvasPlugin from "src/main"

export const GET_NODE_CSS_STYLES_MANAGER = (plugin: AdvancedCanvasPlugin) =>
  new CssStylesConfigManager(plugin, 'advanced-canvas-node-style', styleAttributeValidator)

export default class NodeStylesExtension extends CanvasExtension {
  cssStylesManager: CssStylesConfigManager<StyleAttribute>

  isEnabled() { return 'nodeStylingFeatureEnabled' as const }

  init() {
    this.cssStylesManager = GET_NODE_CSS_STYLES_MANAGER(this.plugin)

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectionNodeData.length === 0 || selectionNodeData.length !== canvas.selection.size)
      return

    const selectedNodeTypes = new Set(selectionNodeData.map(node => node.type))
    const availableNodeStyles = [...BUILTIN_NODE_STYLE_ATTRIBUTES, /* Legacy */ ...this.plugin.settings.getSetting('customNodeStyleAttributes'), ...this.cssStylesManager.getStyles()]
      .filter(style => !style.nodeTypes || style.nodeTypes.some(type => selectedNodeTypes.has(type)))

    CanvasHelper.addStyleAttributesToPopup(
      this.plugin, canvas, availableNodeStyles,
      selectionNodeData[0].styleAttributes ?? {},
      (attribute, value) => CanvasHelper.setStyleAttributeForSelection(canvas, attribute, value)
    )
  }
}
