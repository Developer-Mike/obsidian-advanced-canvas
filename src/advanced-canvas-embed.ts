import { Component, EmbedContext, MarkdownRenderer, TFile } from "obsidian"
import { CanvasData, CanvasFileNodeData, CanvasGroupNodeData, CanvasTextNodeData } from "./@types/AdvancedJsonCanvas"

export default class AdvancedCanvasEmbed extends Component {
  private context: EmbedContext
  private file: TFile
  private subpath: string | undefined

  constructor(context: EmbedContext, file: TFile, subpath?: string) {
    super()

    this.context = context
    this.file = file
    this.subpath = subpath

    if (!subpath) console.warn("AdvancedCanvasEmbed: No subpath provided. This embed will not work as expected.")
  }

  onload() {
    this.context.app.vault.on("modify", this.onModifyCallback)
  }

  onunload() {
    this.context.app.vault.off("modify", this.onModifyCallback)
  }

  private onModifyCallback = (file: TFile) => {
    if (file.path !== this.file.path) return
    this.loadFile()
  }

  async loadFile() {
    if (!this.subpath) return
    const nodeId = this.subpath.replace(/^#/, "")

    const canvasContent = await this.context.app.vault.cachedRead(this.file)
    if (!canvasContent) return console.warn("AdvancedCanvasEmbed: No canvas content found.")

    const canvasJson = JSON.parse(canvasContent) as CanvasData
    const canvasNode = canvasJson.nodes.find(node => node.id === nodeId)

    // Show node not found error
    if (!canvasNode) {
      this.context.containerEl.classList.add("mod-empty")
      this.context.containerEl.textContent = "Node not found"

      return
    }

    // Handle different node types
    let nodeContent = ""
    if (canvasNode.type === "text") nodeContent = (canvasNode as CanvasTextNodeData).text
    else if (canvasNode.type === "group") nodeContent = `**Group Node:** ${(canvasNode as CanvasGroupNodeData).label}`
    else if (canvasNode.type === "file") nodeContent = `**File Node:** ${(canvasNode as CanvasFileNodeData).file}`

    this.context.containerEl.classList.add("markdown-embed")
    this.context.containerEl.empty() // Clear the container (for re-rendering on changes)
    MarkdownRenderer.render(this.context.app, nodeContent, this.context.containerEl, this.file.path, this)
  }
}