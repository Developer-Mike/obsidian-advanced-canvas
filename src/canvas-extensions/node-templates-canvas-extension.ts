import { App, FuzzyMatch, FuzzySuggestModal, getIconIds, Menu, Notice, setIcon, TFile } from "obsidian"
import { CanvasColor } from "obsidian/canvas"
import { AnyCanvasNodeData, CanvasFileNodeData, CanvasLinkNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasNode, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import { AbstractSelectionModal, FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

export interface NodeTemplate {
  icon: string
  label?: string
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
  private registeredNodeTemplateCommandIds: string[]

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

    this.registeredNodeTemplateCommandIds = []
    this.registerNodeTemplateCommands()

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCardMenuCreated(canvas)
    ))
  }

  private registerNodeTemplateCommands() {
    for (const commandId of this.registeredNodeTemplateCommandIds)
      this.plugin.removeCommand(commandId)
    this.registeredNodeTemplateCommandIds = []

    const templates = this.plugin.settings.getSetting("nodeTemplates")
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]
      const commandId = `create-template-node-${i}`

      this.plugin.addCommand({
        id: commandId,
        name: "Create template node " + (template.label ? `"${template.label}"` : (i + 1)),
        checkCallback: CanvasHelper.canvasCommand(
          this.plugin,
          (_: Canvas) => true,
          (canvas: Canvas) => {
            const center = canvas.posCenter()
            void this.createNodeFromTemplate(
              canvas,
              template,
              {
                x: center.x - template.width / 2,
                y: center.y - template.height / 2
              }
            )
          }
        )
      })

      this.registeredNodeTemplateCommandIds.push(commandId)
    }
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
            label: "Drag to add template node " + (template.label ? `"${template.label}"` : (i + 1)),
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
    const label = await new AbstractSelectionModal(this.plugin.app, "Set template label (optional)", [], true).awaitInput()

    await this.plugin.settings.setSetting({
      nodeTemplates: [
        ...this.plugin.settings.getSetting("nodeTemplates"),
        {
          icon: icon,
          label: label ?? undefined,

          type: selectedNodeData.type,
          width: selectedNodeData.width,
          height: selectedNodeData.height,

          color: selectedNodeData.color,
          styleAttributes: selectedNodeData.styleAttributes,

          path: selectedNodeData.type === 'file' ? (selectedNodeData as CanvasFileNodeData).file : undefined,
          url: selectedNodeData.type === 'link' ? (selectedNodeData as CanvasLinkNodeData).url : undefined
        } as NodeTemplate
      ]
    })

    this.registerNodeTemplateCommands()
    this.onCardMenuCreated(canvas)
  }
}

class IconModal extends FuzzySuggestModal<string> {
  constructor(app: App) {
    super(app)

    this.setPlaceholder("Set template icon")
  }

  getItems(): string[] {
    return getIconIds()
  }

  getItemText(item: string): string {
    return item
  }

  renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement): void {
    el.classList.add('icon-modal-suggestion')

    el.createSpan({ cls: 'icon-modal-suggestion-icon' }, (iconEl) => {
      setIcon(iconEl, item.item)
    })
    el.createSpan({
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
