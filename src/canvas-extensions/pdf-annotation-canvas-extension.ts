import { EmbedContext } from "@obsidian-typings/obsidian-public-latest"
import { Component, TFile } from "obsidian"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import { invoke } from "src/patchers/patcher"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"

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
          const node = selection.nodes.first() as CanvasFileNodeData | undefined
          if (!node) return false

          return selection.nodes.length === 1 &&
            node.type === "file" &&
            node.file.endsWith(".pdf")
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
  }

  private patchPdfEmbed(): () => void {
    const embedByExtension = this.plugin.app.embedRegistry.embedByExtension
    const originalPdfEmbed = embedByExtension['pdf']
    if (!originalPdfEmbed) {
      console.error("Failed to patch PDF embed: original embed function not found.")
      return () => { }
    }

    embedByExtension['pdf'] = function (context: EmbedContext, file: TFile, subpath?: string) {
      if (subpath?.includes(`#${PINNED_PARAM}`) || subpath?.includes(`&${PINNED_PARAM}`))
        return new PdfPageEmbedComponent(context, file, subpath)

      return invoke(originalPdfEmbed, this, context, file, subpath)
    }

    return () => {
      embedByExtension['pdf'] = originalPdfEmbed
    }
  }

  private pinPdfPage(node: CanvasNode): void {
    const nodeData = node.getData() as CanvasFileNodeData
    if (!nodeData.subpath) return // No subpath, cannot pin a specific page
    if (nodeData.subpath.includes(`#${PINNED_PARAM}`) || nodeData.subpath.includes(`&${PINNED_PARAM}`))
      return // Already pinned

    node.setData({
      ...nodeData,
      subpath: nodeData.subpath + "&" + PINNED_PARAM
    } as CanvasFileNodeData)
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
    await waitForPdfJsLib()

    const data = await this.context.app.vault.readBinary(this.file)
    const pdf = await window.pdfjsLib.getDocument({ data }).promise

    const pageNumber = this.getPageNumberFromSubpath(this.subpath)
    if (!pageNumber || pageNumber < 1 || pageNumber > pdf.numPages) return

    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.5 })

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
