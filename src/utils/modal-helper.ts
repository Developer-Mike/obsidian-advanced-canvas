import App, { FuzzySuggestModal, SuggestModal, TFile } from 'obsidian'
import FilepathHelper from 'src/utils/filepath-helper'

export class AbstractSelectionModal extends FuzzySuggestModal<string> {
  suggestions: string[]

  constructor(app: App, placeholder: string, suggestions: string[]) {
    super(app)
    
    this.suggestions = suggestions

    this.setPlaceholder(placeholder)
    this.setInstructions([{
        command: '↑↓',
        purpose: 'to navigate'
    }, {
        command: 'esc',
        purpose: 'to dismiss'
    }])
  }

  getItems(): string[] { return this.suggestions }
  getItemText(item: string): string { return item }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void { }
  awaitInput(): Promise<string> {
    return new Promise((resolve, _reject) => {
      this.onChooseItem = (item: string) => { resolve(item) }
      this.open()
    })
  }
}

export class FileNameModal extends SuggestModal<string> {
  parentPath: string
  fileExtension: string

  constructor(app: App, parentPath: string, fileExtension: string) {
    super(app)

    this.parentPath = parentPath.replace(/^\//, '').replace(/\/$/, '')
    this.fileExtension = fileExtension
  }

  getSuggestions(query: string): string[] {
    const queryWithoutExtension = query.replace(new RegExp(`\\.${this.fileExtension}$`), '')
    if (queryWithoutExtension === '') return []

    const queryWithExtension = queryWithoutExtension + '.' + this.fileExtension
    const suggestions = [queryWithExtension]

    if (this.parentPath.length > 0) suggestions.splice(0, 0, `${this.parentPath}/${queryWithExtension}`)
      
    // Filter out suggestions for files that already exist
    return suggestions.filter(s => this.app.vault.getAbstractFileByPath(s) === null)
  }

  renderSuggestion(text: string, el: HTMLElement) {
    el.setText(text)
  }

  onChooseSuggestion(_text: string, _evt: MouseEvent | KeyboardEvent) {}

  awaitInput(): Promise<string> {
    return new Promise((resolve, _reject) => {
      this.onChooseSuggestion = (text: string) => { resolve(text) }
      this.open()
    })
  }
}

export class FileSelectModal extends SuggestModal<string> {
  files: string[]
  suggestNewFile: boolean

  constructor(app: App, extensionsRegex?: RegExp, suggestNewFile: boolean = false) {
    super(app)

    this.files = this.app.vault.getFiles()
      .map(file => file.path)
      .filter(path => FilepathHelper.extension(path)?.match(extensionsRegex ?? /.*/))
    this.suggestNewFile = suggestNewFile

    this.setPlaceholder('Type to search...')
    this.setInstructions([{
        command: '↑↓',
        purpose: 'to navigate'
    }, {
        command: '↵',
        purpose: 'to open'
    }, {
        command: 'shift ↵',
        purpose: 'to create'
    }, {
        command: 'esc',
        purpose: 'to dismiss'
    }])

    this.scope.register(['Shift'], 'Enter', ((e) => {
      this.onChooseSuggestion(this.inputEl.value, e)
      this.close()
    }))
  }

  getSuggestions(query: string): string[] {
    const suggestions = this.files.filter(path => path.toLowerCase().includes(query.toLowerCase()))
    if (suggestions.length === 0 && this.suggestNewFile) suggestions.push(query)

    return suggestions
  }

  renderSuggestion(path: string, el: HTMLElement) {
    const simplifiedPath = path.replace(/\.md$/, '')
    el.setText(simplifiedPath)
  }

  onChooseSuggestion(_path: string, _evt: MouseEvent | KeyboardEvent) {}

  awaitInput(): Promise<TFile> {
    return new Promise((resolve, _reject) => {
      this.onChooseSuggestion = (path: string, _evt: MouseEvent | KeyboardEvent) => {
        const file = this.app.vault.getAbstractFileByPath(path)

        if (file instanceof TFile)
          return resolve(file)

        if (!this.suggestNewFile) return

        if (FilepathHelper.extension(path) === undefined) path += '.md'
        const newFile = this.app.vault.create(path, '')
        resolve(newFile)
      }

      this.open()
    })
  }
}