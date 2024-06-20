import { Canvas } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../canvas-extension"

export default class NodeStylesExtension extends CanvasExtension {
  isEnabled() { return 'nodeStylingFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  onPopupMenuCreated(canvas: Canvas): void {
    // If the canvas is readonly or there is no valid shape in the selection, return
    if (canvas.readonly || !this.hasValidNodeInSelection(canvas))
      return

    // Add shapes menu option
    if (this.plugin.settings.getSetting('shapesFeatureEnabled')) {
      const menuOption = CanvasHelper.createExpandablePopupMenuOption({
        id: 'node-shape-option',
        label: 'Node shape',
        icon: 'shapes'
      }, SHAPES_MENU_OPTIONS.map((shape) => ({
        ...shape,
        callback: () => this.setShapeForSelection(canvas, shape.id)
      })))

      // Add menu option to menu bar
      CanvasHelper.addPopupMenuOption(canvas, menuOption)
    }

    // Add border styles menu option
    if (this.plugin.settings.getSetting('borderStyleFeatureEnabled')) {
      const menuOption = CanvasHelper.createExpandablePopupMenuOption({
        id: 'node-border-style-option',
        label: 'Border style',
        icon: 'box-select'
      }, BORDER_STYLES_MENU_OPTIONS.map((borderStyle) => ({
        ...borderStyle,
        callback: () => this.setBorderStyleForSelection(canvas, borderStyle.id)
      })))

      // Add menu option to menu bar
      CanvasHelper.addPopupMenuOption(canvas, menuOption)
    }
  }

  private hasValidNodeInSelection(canvas: Canvas): boolean {
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      if (nodeData.type === 'text') return true
    }
    
    return false
  }

  private setShapeForSelection(canvas: Canvas, shapeId: string | undefined) {
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      if (nodeData.type !== 'text') continue

      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue
      
      node.setData({ ...nodeData, shape: shapeId }, true)
    }
  }

  private setBorderStyleForSelection(canvas: Canvas, borderId: string | undefined) {
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue
      
      node.setData({ ...nodeData, borderStyle: borderId }, true)
    }
  }
}