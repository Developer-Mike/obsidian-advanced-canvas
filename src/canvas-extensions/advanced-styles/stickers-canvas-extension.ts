import { Canvas } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/core/events"
import CanvasExtension from "../canvas-extension"

const IMAGE_FILE_EXTENSIONS = ["bmp", "png", "jpg", "jpeg", "gif", "svg", "webp", "avif"]

export default class StickersCanvasExtension extends CanvasExtension {
  isEnabled() { return 'stickersFeatureEnabled' as const }

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

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'sticker-option',
        label: 'Toggle sticker',
        icon: 'badge', 
        callback: () => this.toggleStickerForSelection(canvas)
      })
    )
  }

  private hasValidNodeInSelection(canvas: Canvas): boolean {
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      if (nodeData.type !== 'file') continue
      
      const nodeFileExtension = nodeData.file?.split('.').pop()?.toLowerCase()
      if (!nodeFileExtension) continue
      if (!IMAGE_FILE_EXTENSIONS.includes(nodeFileExtension)) continue

      return true
    }
    
    return false
  }

  private toggleStickerForSelection(canvas: Canvas): void {
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      if (nodeData.type !== 'file') continue

      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue
      
      const wasSticker = node.getData().isSticker
      node.setData({ ...nodeData, isSticker: wasSticker ? undefined : true })
    }
  }
}