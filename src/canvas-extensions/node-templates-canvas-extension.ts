import { Canvas, CanvasNode, Position } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasColor, CanvasNodeData } from "obsidian/canvas"
import { AnyCanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import { TFile } from "obsidian"
import { FileSelectModal } from "src/utils/modal-helper"

export default class NodeTemplatesCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.onCardMenuCreated(canvas)
    ))
  }

  private onCardMenuCreated(canvas: Canvas) {
    const templates = [
      {
        type: 'text',
        color: '0' as CanvasColor,
        width: 200,
        height: 100,
        styleAttributes: {
          textAlign: "center",
          validationState: "pending"
        }
      },
      {
        type: 'text',
        color: '2' as CanvasColor,
        width: 200,
        height: 200,
        styleAttributes: {
          textAlign: "right"
        }
      },
      {
        type: 'file',
        color: '2' as CanvasColor,
        width: 400,
        height: 400,
        path: 'tmp.md'
      },
      {
        type: 'link',
        color: '3' as CanvasColor,
        width: 300,
        height: 100,
      },
      {
        type: 'group',
        color: '4' as CanvasColor,
        width: 400,
        height: 400,
        label: 'Group template'
      }
    ] as ({ width: number, height: number } & Partial<CanvasNodeData & { path?: string }>)[]

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]

      CanvasHelper.addCardMenuOption(
        canvas,
        CanvasHelper.createCardMenuOption(
          canvas,
          {
            id: `create-template-node-${i}`,
            label: `Drag to add template node ${i + 1}`,
            icon: 'book-dashed'
          },
          () => ({ width: template.width, height: template.height }),
          async (canvas: Canvas, pos: Position) => {
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
            else if (template.type === 'link') node = canvas.createLinkNode(creationOptions)
            else return

            // FIXME: Delete history containing blank state

            const data = node.getData()
            node.setData({
              ...data,
              ...template,

              styleAttributes: {
                ...data.styleAttributes,
                ...template.styleAttributes
              }
            } as AnyCanvasNodeData, false /* addHistory */)
          }
        )
      )
    }
  }
}
