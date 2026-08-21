import { EmbedContext } from "@obsidian-typings/obsidian-public-latest"
import { Component, TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasElement, CanvasNode } from "src/@types/Canvas"
import { invoke } from "src/patchers/patcher"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"

const PINNED_PARAM = 'pinned=true'

export default class PdfAnnotationCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init(): void {
    this.plugin.register(this.patchPdfEmbed())

    this.plugin.addCommand({
      id: 'pin-pdf-page',
      name: 'Pin pdf page',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => {
          const selection = canvas.getSelectionData()
          const nodeData = selection.nodes.first() as CanvasFileNodeData | undefined
          if (!nodeData) return false

          return selection.nodes.length === 1 &&
            nodeData.type === "file" &&
            nodeData.file.endsWith(".pdf") &&
            !this.isSubpathPinned(nodeData.subpath)
        },
        (canvas: Canvas) => {
          const nodeId = canvas.getSelectionData().nodes.first()?.id
          if (!nodeId) return

          const node = canvas.nodes.get(nodeId)
          if (!node) return

          this.pinPdfPage(node)
        }
      )
    })

    this.plugin.addCommand({
      id: 'annotate-pdf',
      name: 'Annotate pdf in canvas',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => !canvas.readonly,
        async (canvas: Canvas) => {
          const file = await new FileSelectModal(this.plugin.app, /^pdf$/).promise
          if (!file) return

          void this.insertPdfPages(canvas, file)
        }
      )
    })
  }

  private patchPdfEmbed(): () => void {
    const embedByExtension = this.plugin.app.embedRegistry.embedByExtension
    const originalPdfEmbed = embedByExtension['pdf']
    if (!originalPdfEmbed) {
      console.error("Failed to patch PDF embed: original embed function not found.")
      return () => { }
    }

    const isSubpathPinned = this.isSubpathPinned.bind(this) as unknown as (subpath?: string) => boolean
    embedByExtension['pdf'] = function (context: EmbedContext, file: TFile, subpath?: string) {
      if (isSubpathPinned(subpath))
        return new PdfPageEmbedComponent(context, file, subpath)

      return invoke(originalPdfEmbed, this, context, file, subpath)
    }

    return () => {
      embedByExtension['pdf'] = originalPdfEmbed
    }
  }

  private async insertPdfPages(canvas: Canvas, file: TFile) {
    const PDF_PAGE_SCALE = 1.5 // FIXME: Make this configurable
    const PDF_PAGE_SPACING = 60 // FIXME: Make this configurable

    await waitForPdfJsLib()

    const data = await this.plugin.app.vault.readBinary(file)
    const pdf = await window.pdfjsLib.getDocument({ data }).promise

    const pageNodes: Set<CanvasElement> = new Set()
    const pos = CanvasHelper.getCenterCoordinates(canvas, { width: 0, height: 0 })
    let yPos = pos.y
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: PDF_PAGE_SCALE })

      pageNodes.add(canvas.createFileNode({
        pos: { x: pos.x - viewport.width / 2, y: yPos },
        size: { width: viewport.width, height: viewport.height },
        file: file,
        subpath: `#page=${pageNumber}&${PINNED_PARAM}`
      }))

      // FIXME: set z-index and ratio

      yPos += viewport.height + PDF_PAGE_SPACING
    }

    canvas.updateSelection(() => { canvas.selection = pageNodes })
  }

  private pinPdfPage(node: CanvasNode): void {
    const nodeData = node.getData() as CanvasFileNodeData
    if (!nodeData.subpath) return // No subpath, cannot pin a specific page
    if (this.isSubpathPinned(nodeData.subpath)) return // Already pinned

    node.setData({
      ...nodeData,
      subpath: nodeData.subpath + "&" + PINNED_PARAM
    } as CanvasFileNodeData)
  }

  private isSubpathPinned(subpath?: string) {
    if (!subpath) return false

    return subpath.includes(`#${PINNED_PARAM}`) ||
      subpath.includes(`&${PINNED_PARAM}`)
  }
}

abstract class EmbedComponent extends Component {
  abstract loadFile(): Promise<void>
}

class PdfPageEmbedComponent extends EmbedComponent {
  private context: EmbedContext
  private file: TFile
  private subpath?: string

  private canvas: HTMLCanvasElement

  constructor(context: EmbedContext, file: TFile, subpath?: string) {
    super()

    this.context = context
    this.file = file
    this.subpath = subpath
  }

  override onload() {
    this.canvas = activeWindow.createEl('canvas')
    this.canvas.classList.add('ac-pinned-pdf-page-embed')
    this.context.containerEl.appendChild(this.canvas)
  }

  override async loadFile() {
    const PDF_PAGE_RESOLUTION = 1.5 // FIXME: Make this configurable

    await waitForPdfJsLib()

    const data = await this.context.app.vault.readBinary(this.file)
    const pdf = await window.pdfjsLib.getDocument({ data }).promise // FIXME: Maybe caching

    const pageNumber = this.getPageNumberFromSubpath(this.subpath)
    if (!pageNumber || pageNumber < 1 || pageNumber > pdf.numPages) return

    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: PDF_PAGE_RESOLUTION })

    this.canvas.width = viewport.width
    this.canvas.height = viewport.height

    const context = this.canvas.getContext('2d')
    if (!context) return

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
  }

  private getPageNumberFromSubpath(subpath?: string): number | null {
    if (!subpath) return null
    const match = subpath.match(/page=(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }
}

async function waitForPdfJsLib(): Promise<void> {
  return new Promise<void>((resolve) => {
    const interval = window.setInterval(() => {
      if (!window.pdfjsLib) return

      window.clearInterval(interval)
      resolve()
    }, 10)
  })
}
