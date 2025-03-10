import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../canvas-extension"
import { BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute, styleAttributeValidator } from "./style-config"
import CssStylesConfigManager from "src/managers/css-styles-config-manager"

export default class NodeStylesExtension extends CanvasExtension {
  cssStylesManager: CssStylesConfigManager<StyleAttribute>

  isEnabled() { return 'nodeStylingFeatureEnabled' as const }

  init() {
    this.cssStylesManager = new CssStylesConfigManager(this.plugin, 'advanced-canvas-node-style', styleAttributeValidator)

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
      (attribute, value) => this.setStyleAttributeForSelection(canvas, attribute, value)
    )
  }

  private setStyleAttributeForSelection(canvas: Canvas, attribute: StyleAttribute, value: string | null): void {
    const selectionNodeData = canvas.getSelectionData().nodes
    for (const nodeData of selectionNodeData) {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue

      // Only apply the attribute if the node type is allowed
      if (attribute.nodeTypes && !attribute.nodeTypes.includes(nodeData.type)) continue

      node.setData({
        ...nodeData,
        styleAttributes: {
          ...nodeData.styleAttributes,
          [attribute.key]: value
        }
      })
    }
    
    canvas.pushHistory(canvas.getData())
  }
}