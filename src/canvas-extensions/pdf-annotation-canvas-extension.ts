import { EmbedContext } from "@obsidian-typings/obsidian-public-latest"
import { TFile } from "obsidian"
import { invoke } from "src/patchers/patcher"
import CanvasExtension from "./canvas-extension"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"

export default class PdfAnnotationCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    const embedByExtension = this.plugin.app.embedRegistry.embedByExtension
    const originalPdfEmbed = embedByExtension['pdf']
    if (!originalPdfEmbed) return

    embedByExtension['pdf'] = function (context: EmbedContext, file: TFile, subpath?: string) {
      const component = invoke(originalPdfEmbed, this, context, file, subpath)

      if (subpath?.includes('pinned=true')) {
        component.containerEl.classList.add('pinned-pdf-page')
        component.containerEl.style.setProperty('--current-page', String(2))
      }

      return component
    }

    this.plugin.register(() => { embedByExtension['canvas'] = originalPdfEmbed })

    this.plugin.addCommand({
      id: 'pin-pdf-page',
      name: 'Pin pdf page',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.getSelectionData().nodes.length === 1,
        (canvas: Canvas) => this.pinPdfPage(canvas, canvas.nodes.get(canvas.getSelectionData().nodes[0].id)!)
      )
    })
  }

  private pinPdfPage(canvas: Canvas, node: CanvasNode): void {
    if (node.getData().type !== 'file') return

    node.setData({
      ...node.getData(),
      subpath: node.getData().subpath + "&pinned=true"
    })
  }
}
