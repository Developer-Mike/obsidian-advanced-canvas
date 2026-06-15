import { FuzzyMatch, FuzzySuggestModal, getIconIds, Menu, Notice, setIcon, TFile } from "obsidian"
import { CanvasColor, CanvasNodeData } from "obsidian/canvas"
import { AnyCanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasNode, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

export interface NodeTemplate {
  icon: string
  type: string
  width: number
  height: number
  color?: CanvasColor
  styleAttributes?: Record<string, string>
  path?: string // for file nodes
  url?: string // for link nodes
}

const TEMPLATE_NODE_BUTTON_ID_PREFIX = "create-template-node-"

export default class NodeTemplatesCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.addCommand({
      id: 'save-node-as-template',
      name: 'Save node as template',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.getSelectionData().nodes.length === 1,
        (canvas: Canvas) => void this.saveNodeAsTemplate(canvas)
      )
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCardMenuCreated(canvas)
    ))
  }

  private onCardMenuCreated(canvas: Canvas) {
    // Remove existing template buttons
    const existingButtons = canvas.cardMenuEl.querySelectorAll(`[id^="${TEMPLATE_NODE_BUTTON_ID_PREFIX}"]`)
    existingButtons.forEach(button => button.remove())

    // Add template buttons
    const templates = this.plugin.settings.getSetting("nodeTemplates")
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]

      CanvasHelper.addCardMenuOption(
        canvas,
        CanvasHelper.createCardMenuOption(
          canvas,
          {
            id: `${TEMPLATE_NODE_BUTTON_ID_PREFIX}${i}`,
            label: `Drag to add template node ${i + 1}`,
            icon: template.icon ?? 'book-dashed'
          },
          () => ({ width: template.width, height: template.height }),
          (canvas: Canvas, pos: Position) => void this.createNodeFromTemplate(canvas, template, pos),
          (e: PointerEvent) => this.createTemplateContextMenu(e)
        )
      )
    }
  }

  private async createNodeFromTemplate(canvas: Canvas, template: NodeTemplate, pos: Position) {
    const creationOptions = {
      pos: pos,
      size: {
        width: template.width,
        height: template.height
      }
    }

    let node: CanvasNode
    if (template.type === 'text') node = canvas.createTextNode(creationOptions)
    else if (template.type === 'file') {
      let tfile: TFile
      if (template.path) {
        const abstractFile = this.plugin.app.vault.getAbstractFileByPath(template.path)
        if (abstractFile instanceof TFile) tfile = abstractFile
      }

      tfile ??= await new FileSelectModal(this.plugin.app, undefined, true).awaitInput()
      node = canvas.createFileNode({ ...creationOptions, file: tfile })
    } else if (template.type === 'group') node = canvas.createGroupNode(creationOptions)
    else if (template.type === 'link') node = canvas.createLinkNode({ ...creationOptions, url: template.url })
    else throw new Error(`Unknown template type: ${template.type}`)

    // FIXME: Delete history containing blank state

    const data = node.getData()
    node.setData({
      ...data,
      color: template.color ?? data.color,
      styleAttributes: {
        ...data.styleAttributes,
        ...template.styleAttributes
      }
    } as AnyCanvasNodeData, false /* addHistory */)
  }

  private createTemplateContextMenu(e: MouseEvent) {
    const menu = new Menu()

    menu.addItem(item => item
      .setTitle("Remove")
      .setIcon("trash")
      .onClick(async () => {
        const buttonEl = e.target as HTMLElement
        const index = parseInt(buttonEl.id.replace(TEMPLATE_NODE_BUTTON_ID_PREFIX, ""))

        const templates = this.plugin.settings.getSetting("nodeTemplates")
        templates.splice(index, 1)
        await this.plugin.settings.setSetting({ nodeTemplates: templates })

        const canvas = this.plugin.getCurrentCanvas()
        if (canvas) this.onCardMenuCreated(canvas)
      })
    )

    menu.showAtMouseEvent(e)
  }

  private async saveNodeAsTemplate(canvas: Canvas) {
    const selectedNodeData = canvas.getSelectionData().nodes[0]
    const icon = await new IconModal(this.plugin.app).promise
    if (!icon) {
      new Notice("No icon selected, template creation cancelled.")
      return
    }

    await this.plugin.settings.setSetting({
      nodeTemplates: [
        ...this.plugin.settings.getSetting("nodeTemplates"),
        {
          icon: icon,

          type: selectedNodeData.type,
          width: selectedNodeData.width,
          height: selectedNodeData.height,

          color: selectedNodeData.color,
          styleAttributes: selectedNodeData.styleAttributes,

          path: selectedNodeData.type === 'file' ? (selectedNodeData as CanvasNodeData).file : undefined,
          url: selectedNodeData.type === 'link' ? (selectedNodeData as CanvasNodeData).url : undefined
        } as NodeTemplate
      ]
    })

    this.onCardMenuCreated(canvas)
  }
}

class IconModal extends FuzzySuggestModal<string> {
  getItems(): string[] {
    return getIconIds()
  }

  getItemText(item: string): string {
    return item
  }

  renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement): void {
    el.classList.add('icon-modal-suggestion')

    el.createEl('span', { cls: 'icon-modal-suggestion-icon' }, (iconEl) => {
      setIcon(iconEl, item.item)
    })
    el.createEl('span', {
      text: item.item.replace("lucide-", ""),
      cls: 'icon-modal-suggestion-id'
    })
  }

  onChooseItem(_item: string, _evt: MouseEvent | KeyboardEvent) { }

  get promise(): Promise<string | null> {
    return new Promise((resolve, _reject) => {
      this.onChooseItem = (item: string, _evt: MouseEvent | KeyboardEvent) => {
        resolve(item)
      }

      this.onClose = () => window.setTimeout(() => {
        resolve(null)
      }, 10)

      this.open()
    })
  }
}
