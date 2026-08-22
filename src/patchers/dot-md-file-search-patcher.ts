// Added by an LLM agent
import { Modal, Notice, SearchResult, prepareFuzzySearch, renderMatches } from "obsidian"
import { Canvas } from "src/@types/Canvas"
import Patcher from "./patcher"

// A file named exactly ".md" is a hidden dotfile. Obsidian's vault layer never indexes
// dotfiles, so they are missing from vault.getFiles() — and therefore from the canvas
// "Add note from vault" search modal. The adapter still lists them, so this patcher
// discovers them via app.vault.adapter and injects them into that modal's suggestions.

// Duck-typed shape of Obsidian's private canvas file-suggest modal
interface CanvasFileSuggestModal extends Modal {
  canvas: Canvas
  shouldShowMarkdown: boolean
  inputEl?: HTMLInputElement
  handleChoose: (file: unknown) => void
  getSuggestions: (query: string) => FileSuggestionItem[]
  renderSuggestion: (item: FileSuggestionItem, el: HTMLElement) => void
  onChooseSuggestion: (item: FileSuggestionItem | null, evt: unknown) => void
  acDotMdPatched?: boolean
}

interface FileSuggestionItem {
  type: string
  file: unknown
  match: SearchResult | null
  acDotMdPath?: string
}

interface DotMdFileEntry {
  path: string
  file: unknown // TFile duck-type — the vault has no real TFile for dotfiles
}

export default class DotMdFileSearchPatcher extends Patcher {
  private dotMdFiles: DotMdFileEntry[] = []

  protected async patch() {
    if (!this.plugin.settings.getSetting('dotMdFileSearchEnabled')) return

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    Patcher.patch(this.plugin, Modal.prototype, {
      open: next => function (this: Modal, ...args: unknown[]): void {
        that.onModalOpen(this as CanvasFileSuggestModal)
        next.call(this, ...args)
      }
    })

    // Warm the cache on startup so the files are found on the first modal open
    this.plugin.app.workspace.onLayoutReady(() => void this.refreshDotMdFiles())
  }

  private onModalOpen(modal: CanvasFileSuggestModal) {
    // Only patch the canvas "Add note from vault" file-suggest modal
    // (duck-typed: it is the only suggest modal carrying a canvas reference)
    if (modal.acDotMdPatched) return
    if (!modal.canvas || typeof modal.canvas.createFileNode !== 'function') return
    if (modal.shouldShowMarkdown !== true) return
    if (typeof modal.getSuggestions !== 'function' || typeof modal.handleChoose !== 'function') return
    modal.acDotMdPatched = true

    void this.refreshDotMdFiles(modal)

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    Patcher.patch(this.plugin, modal, {
      getSuggestions: next => function (this: CanvasFileSuggestModal, query: string) {
        const suggestions = next.call(this, query) as FileSuggestionItem[]
        // Prepend so the modal's result limit can't cut them off
        return [...that.getDotMdSuggestions(query), ...suggestions]
      },
      renderSuggestion: next => function (this: CanvasFileSuggestModal, item: FileSuggestionItem, el: HTMLElement): void {
        if (!item?.acDotMdPath) { next.call(this, item, el); return }

        el.addClass('mod-complex')
        const contentEl = el.createDiv('suggestion-content')
        const titleEl = contentEl.createDiv('suggestion-title')
        renderMatches(titleEl, item.acDotMdPath, item.match?.matches ?? null)
        contentEl.createDiv({ cls: 'suggestion-note', text: 'Hidden dotfile (not indexed by Obsidian)' })
        el.createDiv('suggestion-aux').createSpan({ cls: 'suggestion-flair' })
      },
      onChooseSuggestion: next => function (this: CanvasFileSuggestModal, item: FileSuggestionItem | null, evt: unknown): void {
        if (!item?.acDotMdPath) { next.call(this, item, evt); return }

        try { this.handleChoose(item.file) }
        catch (e) {
          console.error('Advanced Canvas: Failed to add ".md" file node to the canvas.', e)
          new Notice('Advanced Canvas: Failed to add the ".md" file to the canvas.')
        }
      }
    })
  }

  private getDotMdSuggestions(query: string): FileSuggestionItem[] {
    const trimmed = query.trim()
    if (!trimmed) return this.dotMdFiles.map(entry => this.toSuggestion(entry, null))

    const search = prepareFuzzySearch(trimmed)
    const suggestions: FileSuggestionItem[] = []
    for (const entry of this.dotMdFiles) {
      const match = search(entry.path)
      if (match) suggestions.push(this.toSuggestion(entry, match))
    }

    return suggestions
  }

  private toSuggestion(entry: DotMdFileEntry, match: SearchResult | null): FileSuggestionItem {
    return { type: 'file', file: entry.file, match: match, acDotMdPath: entry.path }
  }

  private async refreshDotMdFiles(modal?: CanvasFileSuggestModal) {
    const entries: DotMdFileEntry[] = []

    const walk = async (folder: string) => {
      let listed
      try { listed = await this.plugin.app.vault.adapter.list(folder) }
      catch { return }

      for (const path of listed.files) {
        if (path.split('/').pop() === '.md')
          entries.push({ path: path, file: this.createFakeTFile(path) })
      }

      // Skip hidden folders (.obsidian, .git, ...) — their content is hidden too
      for (const subFolder of listed.folders) {
        if (!subFolder.split('/').pop()?.startsWith('.')) await walk(subFolder)
      }
    }

    await walk('/')
    this.dotMdFiles = entries

    // The walk is async, so the suggestions shown for the current query may be
    // stale — re-run the search if the modal is still open
    if (modal?.inputEl && modal.modalEl.isConnected)
      modal.inputEl.dispatchEvent(new Event('input'))
  }

  private createFakeTFile(path: string) {
    return {
      path: path,
      name: '.md',
      basename: '',
      extension: 'md',
      stat: { ctime: 0, mtime: 0, size: 0 },
      vault: this.plugin.app.vault,
      parent: null,
      getShortName: () => '.md'
    }
  }
}
