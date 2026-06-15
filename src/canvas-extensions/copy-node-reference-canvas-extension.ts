import { Canvas } from 'src/@types/Canvas'
import CanvasHelper, { MenuOption } from 'src/utils/canvas-helper'
import CanvasExtension from './canvas-extension'
import { Notice, TFile } from 'obsidian'
import TextHelper from "../utils/text-helper"
import { CanvasNodeData } from "obsidian/canvas"

export default class CopyNodeReferenceCanvasExtension extends CanvasExtension {
  isEnabled() { return 'enableSingleNodePopupReferenceCopy' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas): void {
    const popupMenuEl = canvas?.menu?.menuEl
    if (!popupMenuEl) return

    const selectionData = canvas.getSelectionData()
    if (selectionData.nodes.length !== 1 && selectionData.edges.length === 0) return

    const menuOption: MenuOption = {
      id: 'node-popup-menu-option-copy-reference',
      label: 'Copy wikilink to node',
      icon: 'link',
      callback: () => CopyNodeReferenceCanvasExtension.copyWikilinkToNode(canvas.view.file, selectionData.nodes[0])
    }

    const popupMenuOption = CanvasHelper.createPopupMenuOption(menuOption)
    CanvasHelper.addPopupMenuOption(canvas, popupMenuOption)
  }

  static copyWikilinkToNode(file: TFile, nodeData: CanvasNodeData) {
    const nodeTypeString = TextHelper.toTitleCase(nodeData.type as string)
    const wikilink = `[[${file.path}#${nodeData.id}|${file.name} (${nodeTypeString} node)]]`

    navigator.clipboard.writeText(wikilink).then(() =>
      new Notice("Copied wikilink to node to clipboard.", 2000)
    ).catch(() => new Notice("Failed to copy wikilink to node to clipboard.", 2000))
  }

}
