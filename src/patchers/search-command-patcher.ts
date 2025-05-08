import { CanvasView } from "src/@types/Canvas"
import Patcher from "./patcher"
import { setIcon } from "obsidian"
import { CanvasGroupNodeData, CanvasTextNodeData } from "src/@types/AdvancedJsonCanvas"

export default class SearchCommandPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('nativeFileSearchEnabled')) return

    const that = this
    Patcher.patch(this.plugin, this.plugin.app.commands.commands["editor:open-search"], {
      checkCallback: Patcher.OverrideExisting(next => function (this: any, checking: boolean) {
        // If there is an active md editor, return the original method
        if (that.plugin.app.workspace.activeEditor) return next.call(this, checking)

        // If there is no active canvas view, return the original method
        const activeCanvasView = that.plugin.getCurrentCanvasView()
        if (!activeCanvasView) return next.call(this, checking)

        // Always allow the command to be executed in canvas view
        if (checking) return true

        // Show the search view in the active canvas view
        if (!activeCanvasView.canvas.searchEl) new CanvasSearchView(activeCanvasView)

        return true
      })
    })
  }
}

interface SearchMatch {
  nodeId: string
  content: string
  matches: number[][]
}

class CanvasSearchView {
  private view: CanvasView

  private containerEl: HTMLDivElement
  private searchInput: HTMLInputElement
  private searchCount: HTMLDivElement

  private searchMatches: SearchMatch[] = []
  private matchIndex: number = 0

  constructor(view: CanvasView) {
    this.view = view
    this.createSearchView()
  }

  private createSearchView() {
    this.containerEl = document.createElement("div")
    this.containerEl.className = "document-search-container"

    const documentSearch = document.createElement("div")
    documentSearch.className = "document-search"
    this.containerEl.appendChild(documentSearch)

    const searchInputContainer = document.createElement("div")
    searchInputContainer.className = "search-input-container document-search-input"
    documentSearch.appendChild(searchInputContainer)

    this.searchInput = document.createElement("input")
    this.searchInput.type = "text"
    this.searchInput.placeholder = "Find..."
    this.searchInput.addEventListener("keydown", (e: KeyboardEvent) => this.onKeyDown(e))
    this.searchInput.addEventListener("input", () => this.onInput())
    searchInputContainer.appendChild(this.searchInput)

    this.searchCount = document.createElement("div")
    this.searchCount.className = "document-search-count"
    this.searchCount.style.display = "none"
    this.searchCount.textContent = "0 / 0"
    searchInputContainer.appendChild(this.searchCount)

    const documentSearchButtons = document.createElement("div")
    documentSearchButtons.className = "document-search-buttons"
    documentSearch.appendChild(documentSearchButtons)

    const previousButton = document.createElement("button")
    previousButton.className = "clickable-icon document-search-button"
    previousButton.setAttribute("aria-label", "Previous\nShift + F3")
    previousButton.setAttribute("data-tooltip-position", "top")
    setIcon(previousButton, "arrow-up")
    previousButton.addEventListener("click", () => this.changeMatch(this.matchIndex - 1))
    documentSearchButtons.appendChild(previousButton)

    const nextButton = document.createElement("button")
    nextButton.className = "clickable-icon document-search-button"
    nextButton.setAttribute("aria-label", "Next\nF3")
    nextButton.setAttribute("data-tooltip-position", "top")
    setIcon(nextButton, "arrow-down")
    nextButton.addEventListener("click", () => this.changeMatch(this.matchIndex + 1))
    documentSearchButtons.appendChild(nextButton)

    const closeButton = document.createElement("button")
    closeButton.className = "clickable-icon document-search-close-button"
    closeButton.setAttribute("aria-label", "Exit search")
    closeButton.setAttribute("data-tooltip-position", "top")
    setIcon(closeButton, "x")
    closeButton.addEventListener("click", () => this.close())
    documentSearch.appendChild(closeButton)

    this.view.canvas.wrapperEl.appendChild(this.containerEl)
    this.view.canvas.searchEl = this.containerEl

    this.searchInput.focus()
  }

  private onKeyDown(e: KeyboardEvent) {
    // TODO: Fix arrows moving the node and not the cursor

    if (e.key === "Enter" || e.key === "F3")
      this.changeMatch(this.matchIndex + (e.shiftKey ? -1 : 1))
    else if (e.key === "Escape")
      this.close()
  }

  private onInput() {
    const hasQuery = this.searchInput.value.length > 0
    this.searchCount.style.display = hasQuery ? "block" : "none"

    if (!hasQuery) this.searchMatches = []
    else {
      this.searchMatches = Array.from(this.view.canvas.nodes.values()).map(node => {
        const nodeData = node.getData()

        let content: string | undefined = undefined
        if (nodeData.type === "text") content = (nodeData as CanvasTextNodeData).text
        else if (nodeData.type === "group") content = (nodeData as CanvasGroupNodeData).label
        else if (nodeData.type === "file") content = node.child.data
        
        if (!content) return null

        const matches: number[][] = []
        const regex = new RegExp(this.searchInput.value, "gi")
        let match: RegExpExecArray | null
        while ((match = regex.exec(content)) !== null) {
          matches.push([match.index, match.index + match[0].length])
        }

        return { nodeId: node.id, content: content, matches: matches }
      }).filter(match => match && match.matches.length > 0) as SearchMatch[]
    }

    // Update match index and update the count display
    this.changeMatch(0)
  }

  private changeMatch(index: number) {
    // Bind the index to the range of searchMatches
    if (this.searchMatches.length === 0) this.matchIndex = -1
    else {
      if (index < 0) index += this.searchMatches.length
      this.matchIndex = index % this.searchMatches.length
    }

    const match = this.searchMatches[this.matchIndex]
    if (match) this.goToMatch(match)

    this.searchCount.textContent = `${this.matchIndex + 1} / ${this.searchMatches.length}`
  }

  private goToMatch(match: SearchMatch) {
    this.view.setEphemeralState({ match: match })
  }

  private close() {
    this.containerEl.remove()
    this.view.canvas.searchEl = undefined
  }
}