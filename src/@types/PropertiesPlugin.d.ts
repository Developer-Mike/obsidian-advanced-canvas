import { App, TFile } from "obsidian"

export default interface PropertiesView {
  app: App
  file: TFile
  modifyingFile: TFile

  rawFrontmatter: string
  frontmatter: { [key: string]: unknown }

  isSupportedFile: (file?: TFile) => boolean
  updateFrontmatter: (file: TFile, content: string) => { [ key: string ]: unknown } | null
  saveFrontmatter: (frontmatter: { [key: string]: unknown }) => void
}
