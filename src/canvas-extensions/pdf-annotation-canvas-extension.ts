import { EmbedContext, PDFDocumentProxy } from "@obsidian-typings/obsidian-public-latest"
import { Component, FileView, TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { Canvas, CanvasElement, CanvasNode } from "src/@types/Canvas"
import { invoke } from "src/patchers/patcher"
import CanvasHelper from "src/utils/canvas-helper"
import { FileSelectModal } from "src/utils/modal-helper"
import CanvasExtension from "./canvas-extension"
import AdvancedCanvasPlugin from "src/main"

const PINNED_PARAM = 'pinned=true'

export default class PdfAnnotationCanvasExtension extends CanvasExtension {
  isEnabled() { return 'pdfAnnotationFeatureEnabled' as const }

  init(): void {
    this.plugin.register(this.patchPdfEmbed())

    this.plugin.addCommand({
      id: 'pin-pdf-page',
      name: 'Pin PDF page',
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
      name: 'Annotate PDF in canvas',
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

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patched function
    embedByExtension['pdf'] = function (context: EmbedContext, file: TFile, subpath?: string) {
      if (that.isSubpathPinned(subpath)) {
        const view = context.app.workspace.getActiveFileView()
        return new PdfPageEmbedComponent(that.plugin, view, context, file, subpath)
      }

      return invoke(originalPdfEmbed, this, context, file, subpath)
    }

    return () => {
      embedByExtension['pdf'] = originalPdfEmbed
    }
  }

  private async insertPdfPages(canvas: Canvas, file: TFile) {
    await waitForPdfJsLib()

    const data = await this.plugin.app.vault.readBinary(file)
    const pdf = await window.pdfjsLib.getDocument({ data }).promise

    const pdfPageSpacing = this.plugin.settings.getSetting("pdfPagesGap")
    const pdfPageScale = this.plugin.settings.getSetting("pdfPageSizeFactor")

    const pos = CanvasHelper.getCenterCoordinates(canvas, { width: 0, height: 0 })
    let yPos = pos.y
    const minZIndex = Math.min(...[...canvas.nodes.values()].map(n => n.zIndex))
    const zIndex = Math.abs(minZIndex) !== Infinity ? minZIndex - 1 : -1000

    const pageNodes: Set<CanvasElement> = new Set()
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: pdfPageScale })

      const node = canvas.createFileNode({
        pos: { x: pos.x - viewport.width / 2, y: yPos },
        size: { width: viewport.width, height: viewport.height },
        file: file,
        subpath: `#page=${pageNumber}&${PINNED_PARAM}`
      })
      pageNodes.add(node)

      node.setZIndex(zIndex)
      node.setData({
        ...node.getData(),
        ratio: viewport.width / viewport.height
      })

      yPos += viewport.height + pdfPageSpacing
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

interface PdfCacheHoldingView {
  pdfCache?: Map<string, PDFDocumentProxy>
}

class PdfPageEmbedComponent extends EmbedComponent {
  private plugin: AdvancedCanvasPlugin
  private parent: PdfCacheHoldingView | null
  private context: EmbedContext
  private file: TFile
  private subpath?: string

  private canvas: HTMLCanvasElement

  constructor(plugin: AdvancedCanvasPlugin, parent: FileView | null, context: EmbedContext, file: TFile, subpath?: string) {
    super()

    this.plugin = plugin
    this.parent = parent as PdfCacheHoldingView | null
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
    await waitForPdfJsLib()

    let pdf = this.parent?.pdfCache?.get(this.file.path)
    if (!pdf) {
      const data = await this.context.app.vault.readBinary(this.file)
      pdf = await window.pdfjsLib.getDocument({ data }).promise

      if (this.parent) {
        this.parent.pdfCache ??= new Map<string, PDFDocumentProxy>()
        this.parent.pdfCache.set(this.file.path, pdf)
      }
    }

    const pageNumber = this.getPageNumberFromSubpath(this.subpath)
    if (!pageNumber || pageNumber < 1 || pageNumber > pdf.numPages) return

    const page = await pdf.getPage(pageNumber)
    const pdfPageResolution = this.plugin.settings.getSetting("pdfPageSizeFactor")
    const viewport = page.getViewport({ scale: pdfPageResolution })

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

// FIXME: Never resolving if no pdf is ever opened
async function waitForPdfJsLib(): Promise<void> {
  return new Promise<void>((resolve) => {
    const interval = window.setInterval(() => {
      if (!window.pdfjsLib) return

      window.clearInterval(interval)
      resolve()
    }, 10)
  })
}
