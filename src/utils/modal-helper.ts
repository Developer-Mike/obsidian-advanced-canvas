import App, { SuggestModal, TFile } from "obsidian"

export class FileNameModal extends SuggestModal<string> {
  parentPath: string
  fileExtension: string

  constructor(app: App, parentPath: string, fileExtension: string) {
    super(app)

    this.parentPath = parentPath
    this.fileExtension = fileExtension
  }

  getSuggestions(query: string): string[] {
    const queryWithoutExtension = query.replace(new RegExp(`\\.${this.fileExtension}$`), '')
    if (queryWithoutExtension === '') return []

    const queryWithExtension = queryWithoutExtension + '.' + this.fileExtension
    const suggestions = [`${this.parentPath}/${queryWithExtension}`, queryWithExtension]
      // Filter out suggestions for files that already exist
      .filter(s => this.app.vault.getAbstractFileByPath(s) === null)

    return suggestions
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

export class FileSelectModal extends SuggestModal<TFile> {
  files: TFile[]

  constructor(app: App, extensionsRegex: string) {
    super(app)

    this.files = this.app.vault.getFiles().filter(f => f.path.match(new RegExp(extensionsRegex)))
  }

  getSuggestions(query: string): TFile[] {
    return this.files
      .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
  }

  renderSuggestion(file: TFile, el: HTMLElement) {
    el.setText(file.extension === 'md' ? file.basename : file.name)
  }

  onChooseSuggestion(_file: TFile, _evt: MouseEvent | KeyboardEvent) {}

  awaitInput(): Promise<TFile> {
    return new Promise((resolve, _reject) => {
      this.onChooseSuggestion = (file: TFile) => { resolve(file) }
      this.open()
    })
  }
}