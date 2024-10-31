import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../core/canvas-extension"
import { CanvasEvent } from "src/core/events"
import { Menu } from "obsidian"

// TODO: Settings
// embedPropertiesShowOverwriteWarning: true
// embedPropertiesAddNondirectionalEdges: true
// embedPropertiesAddUnlabelledEdges: true
// embedPropertiesUnlabelledEdgesPropertyKey: 'unnamed'

type ConnectedNodes = { [edgeLabel: string]: CanvasNode[] }

export default class EmbedPropertiesCanvasExtension extends CanvasExtension {
  isEnabled() { return 'embedPropertiesEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'pull-properties-from-embed',
      name: 'Pull Properties from Embed',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && this.getSelectedMarkdownFileNodes(canvas).length > 0,
        (canvas: Canvas) => this.pullPropertiesFromEmbed(canvas)
      )
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.NodeContextMenu,
      (menu: Menu, node: CanvasNode) => this.onNodeContextMenu(menu, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.SelectionContextMenu,
      (menu: Menu, canvas: Canvas) => this.onSelectionContextMenu(menu, canvas)
    ))
  }

  private getSelectedMarkdownFileNodes(canvas: Canvas) {
    return [...canvas.selection].filter(node => {
      const nodeData = node.getData()
      return nodeData?.type === 'file' && nodeData?.file?.endsWith('.md')
    }) as CanvasNode[]
  }

  private onNodeContextMenu(menu: Menu, node: CanvasNode) {
    const canvas = node.canvas
    if (this.getSelectedMarkdownFileNodes(canvas).length === 0) return

    this.addContextMenuItems(menu, canvas)
  }

  private onSelectionContextMenu(menu: Menu, canvas: Canvas) {
    if (this.getSelectedMarkdownFileNodes(canvas).length === 0) return

    this.addContextMenuItems(menu, canvas)
  }

  private addContextMenuItems(menu: Menu, canvas: Canvas) {
    menu.addSeparator()

    menu.addItem(item => {
      item.setTitle('Pull Properties from Embed')
      item.setIcon('download')
      item.onClick(() => this.pullPropertiesFromEmbed(canvas))
    })

    menu.addItem(item => {
      item.setTitle('Push Properties to Embed')
      item.setIcon('upload')
      item.onClick(() => this.pushPropertiesToEmbed(canvas))
    })

    menu.addSeparator()
  }

  private async pullPropertiesFromEmbed(canvas: Canvas) {
    const selectedFileNodes = this.getSelectedMarkdownFileNodes(canvas)
    
    for (const node of selectedFileNodes) {
      const nodeData = node.getData()

      // Remove all current edges (only those with labels)
      const connectedNodes = this.getConnectedNodes(node)
      for (const connectedNode of Object.values(connectedNodes).flat())
        canvas.removeNode(connectedNode)

      // TODO: Add new nodes
      // TODO: Add new edges
    }
  }

  private async pushPropertiesToEmbed(canvas: Canvas) {
    const selectedFileNodes = this.getSelectedMarkdownFileNodes(canvas)

    for (const node of selectedFileNodes) {
      const nodeData = node.getData()

      const connectedNodes = this.getConnectedNodes(node)

      const file = await this.plugin.app.vault.getFileByPath(nodeData.file!)
      if (!file) continue

      this.plugin.app.fileManager.processFrontMatter(file, async frontmatter => {
        const confirmed = 
          Object.keys(frontmatter).length === 0 || // Either no frontmatter with which to overwrite
          !this.plugin.settings.getSetting('embedPropertiesShowOverwriteWarning') || // Or the user has disabled the warning
          await this.showWarningDialog() // Or the user has confirmed the warning
        if (!confirmed) return frontmatter

        return this.getNewProperties(node, connectedNodes)
      })
    }
  }

  private getConnectedNodes(node: CanvasNode): ConnectedNodes {
    const canvas = node.canvas
    const edges = canvas.getEdgesForNode(node)
    if (!edges) return {}

    // TODO

    return {}
  }

  private getNewProperties(node: CanvasNode, connectedNodes: ConnectedNodes) {
    // TODO
    return {}
  }

  private async showWarningDialog() {
    return false
  }
}