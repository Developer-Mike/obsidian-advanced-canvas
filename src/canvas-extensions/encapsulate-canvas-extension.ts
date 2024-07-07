import { Menu } from "obsidian"
import { Canvas } from "src/@types/Canvas"
import { FileNameModal } from "src/utils/modal-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../core/canvas-extension"
import { CanvasEvent } from "src/core/events"

const ENCAPSULATED_FILE_NODE_SIZE = { width: 300, height: 300 }

export default class EncapsulateCanvasExtension extends CanvasExtension {
  isEnabled() { return 'canvasEncapsulationEnabled' as const }

  init() {
    /* Add command to encapsulate selection */
    this.plugin.addCommand({
      id: 'encapsulate-selection',
      name: 'Encapsulate selection',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly && canvas.selection.size > 0,
        (canvas: Canvas) => this.encapsulateSelection(canvas)
      )
    })

    /* Add encapsulate option to context menu */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.SelectionContextMenu,
      (menu: Menu, canvas: Canvas) => {
        menu.addItem((item) =>
          item
            .setTitle('Encapsulate')
            .setIcon('file-plus')
            .onClick(() => this.encapsulateSelection(canvas))
        )
      }
    ))
  }

  async encapsulateSelection(canvas: Canvas) {
    const selection = canvas.getSelectionData()

    // Create new file
    const sourceFileFolder = canvas.view.file.parent?.path
    if (!sourceFileFolder) return // Should never happen

    const targetFilePath = await new FileNameModal(
      this.plugin.app,
      sourceFileFolder,
      'canvas'
    ).awaitInput()

    const newFileData = { nodes: selection.nodes, edges: selection.edges }
    const file = await this.plugin.app.vault.create(targetFilePath, JSON.stringify(newFileData, null, 2))

    // Remove from current canvas
    for (const nodeData of selection.nodes) {
      const node = canvas.nodes.get(nodeData.id)
      if (node) canvas.removeNode(node)
    }

    // Add link to new file in current canvas
    canvas.createFileNode({
      pos: {
        x: selection.center.x - ENCAPSULATED_FILE_NODE_SIZE.width / 2,
        y: selection.center.y - ENCAPSULATED_FILE_NODE_SIZE.height / 2
      },
      size: ENCAPSULATED_FILE_NODE_SIZE,
      file: file
    })
  }
}