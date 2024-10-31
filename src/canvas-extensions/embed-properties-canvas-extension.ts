import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "../core/canvas-extension"
import { CanvasEvent } from "src/core/events"
import { Menu } from "obsidian"

// TODO: Settings
// embedPropertiesShowOverwriteWarning: true
// embedPropertiesAddNondirectionalEdges: true
// embedPropertiesAddUnlabelledEdges: true
// embedPropertiesUnlabelledEdgesPropertyKey: 'unnamed'

export default class EmbedPropertiesCanvasExtension extends CanvasExtension {
  isEnabled() { return 'embedPropertiesEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'pull-properties-from-embed',
      name: 'Pull Properties from Embed',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && this.hasMarkdownFileNodeSelected(canvas),
        (canvas: Canvas) => this.pullPropertiesFromEmbed(canvas)
      )
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeContextMenu,
      (menu: Menu, node: CanvasNode) => this.onNodeContextMenu(menu, node)
    ))
  }

  private hasMarkdownFileNodeSelected(canvas: Canvas) {
    const selectionData = canvas.getSelectionData()
    return selectionData.nodes.some(node => node.type === 'file' && node.getData().type === 'file')
  }

  private pullPropertiesFromEmbed(canvas: Canvas) {

  }

  private pushPropertiesToEmbed(canvas: Canvas) {
    
  }

  private onNodeContextMenu(menu: Menu, node: CanvasNode) {
    const nodeData = node.getData()
    if (nodeData.type !== 'file') return
    
    menu.addItem(item => {
      item.setTitle('Pull Properties from Embed')
      item.setIcon('download')
      item.onClick(() => this.pullPropertiesFromEmbed(node.canvas))
    })

    menu.addItem(item => {
      item.setTitle('Push Properties to Embed')
      item.setIcon('upload')
      item.onClick(() => this.pushPropertiesToEmbed(node.canvas))
    })
  }
}