import { Canvas, CanvasNode } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/events/events"

export default class StickersCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('stickersFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  onPopupMenuCreated(canvas: Canvas): void {
    // If the canvas is readonly or there is no valid shape in the selection, return
    if (canvas.readonly || !this.hasValidShapeInSelection(canvas.selection))
      return

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption(
        'sticker-option',
        'Toggle sticker',
        'badge', 
        () => this.toggleStickerForSelection(canvas)
      )
    )
  }

  private hasValidShapeInSelection(selection: Set<CanvasNode>): boolean {
    if (!selection) return false

    for (const node of selection) {
      if (node.getData().type === 'file') return true
    }
    
    return false
  }

  private toggleStickerForSelection(canvas: Canvas): void {
    for (const node of canvas.selection) {
      if (node.getData().type !== 'file') continue
      
      const wasSticker = node.getData().isSticker
      canvas.setNodeData(node, 'isSticker', wasSticker ? undefined : true)
    }
  }
}