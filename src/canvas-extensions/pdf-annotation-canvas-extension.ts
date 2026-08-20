import { EmbedContext } from "@obsidian-typings/obsidian-public-latest"
import { Component, TFile } from "obsidian"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import { invoke } from "src/patchers/patcher"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

export default class PdfAnnotationCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    const embedByExtension = this.plugin.app.embedRegistry.embedByExtension
    const originalPdfEmbed = embedByExtension['pdf']
    if (!originalPdfEmbed) return

    embedByExtension['pdf'] = function (context: EmbedContext, file: TFile, subpath?: string) {
      if (subpath?.includes('pinned=true'))
        return new PdfPageEmbedComponent(context, file, subpath)

      return invoke(originalPdfEmbed, this, context, file, subpath)
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

abstract class EmbedComponent extends Component {
  abstract loadFile(): void
}

class PdfPageEmbedComponent extends EmbedComponent {
  private context: EmbedContext
  private file: TFile
  private subpath?: string

  constructor(context: EmbedContext, file: TFile, subpath?: string) {
    super()

    this.context = context
    this.file = file
    this.subpath = subpath
  }

  override onload() {

  }

  override loadFile() {
    (async () => {
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (!(window as any).pdfjsLib) return

          clearInterval(interval)
          resolve()
        }, 10)
      })

    const data = await this.context.app.vault.readBinary(this.file)
  const pdf = await (window as any).pdfjsLib.getDocument({ data }).promise

  const pageNumber = this.getPageNumberFromSubpath(this.subpath)
  if (!pageNumber || pageNumber < 1 || pageNumber > pdf.numPages) return

  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.0 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const renderContext = {
    canvasContext: canvas.getContext('2d'),
    viewport: viewport
  }
  await page.render(renderContext).promise

    this.context.containerEl.appendChild(canvas)
    })()
  }

  private getPageNumberFromSubpath(subpath?: string): number | null {
    if (!subpath) return null
    const match = subpath.match(/page=(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }
}
