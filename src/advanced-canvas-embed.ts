import { Component, EmbedContext, MarkdownRenderer, TFile } from "obsidian"
import { CanvasData, CanvasFileNodeData, CanvasGroupNodeData, CanvasTextNodeData } from "./@types/AdvancedJsonCanvas"

export default class AdvancedCanvasEmbed extends Component {
  private context: EmbedContext
  private file: TFile
  private subpath: string | undefined
  private embed: Component | null = null

  constructor(context: EmbedContext, file: TFile, subpath?: string) {
    super()

    this.context = context
    this.file = file
    this.subpath = subpath

    if (!subpath) console.warn("AdvancedCanvasEmbed: No subpath provided. This embed will not work as expected.")
  }

  private onModifyCallback = (file: TFile) => {
    if (file.path !== this.file.path) return
    void this.loadFile()
  }

  override onload() {
    this.context.app.vault.on("modify", this.onModifyCallback)
  }

  override onunload() {
    this.context.app.vault.off("modify", this.onModifyCallback)
  }

  async loadFile() {
    this.context.containerEl.setAttribute("src", this.file.path)
    this.embed?.onunload()
    this.embed = null

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

    if (canvasNode.type === "text" || canvasNode.type === "group") {
      const nodeContent = canvasNode.type === "text" ?
        (canvasNode as CanvasTextNodeData).text :
        `**Group Node:** ${(canvasNode as CanvasGroupNodeData).label}`

      this.context.containerEl.empty() // Clear the container (for re-rendering on changes)
      this.context.containerEl.classList.add("ac-card-embed")
      if (canvasNode.color !== undefined) {
        this.context.containerEl.classList.add("is-themed")
        this.context.containerEl.classList.add(`mod-canvas-color-${canvasNode.color}`)
      }

      const markdownContainer = this.context.containerEl.createSpan()
      markdownContainer.classList.add("markdown-content")
      await MarkdownRenderer.render(this.context.app, nodeContent, markdownContainer, this.file.path, this)
    } else if (canvasNode.type === "file") {
      const filepath = (canvasNode as CanvasFileNodeData).file
      if (!filepath) return console.warn("File node does not reference a file.")

      const file = this.context.app.vault.getAbstractFileByPath(filepath)
      if (!(file instanceof TFile)) return console.warn("File referenced by file node not found.")

      const Embed = this.context.app.embedRegistry.getEmbedCreator(file) as
        (new (context: EmbedContext, file: TFile, subpath?: string) => Component) | null
      if (!Embed) return console.warn("Native embed for file node not found.")

      this.context.containerEl.setAttribute("src", filepath.replace(".md", ""))
      this.embed = new Embed(this.context, file)
      this.embed?.onload()
    }
  }
}
