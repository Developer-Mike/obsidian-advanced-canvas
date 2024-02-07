import App, { SuggestModal } from "obsidian"

export default class FileNameModal extends SuggestModal<string> {
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

  static awaitInput(modal: FileNameModal): Promise<string> {
    return new Promise((resolve, _reject) => {
      modal.onChooseSuggestion = (text: string) => { resolve(text) }
      modal.open()
    })
  }
}