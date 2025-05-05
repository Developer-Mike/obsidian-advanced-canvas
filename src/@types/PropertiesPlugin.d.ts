import { App, TFile } from "obsidian"

export default interface PropertiesView {
  app: App
  file: TFile
  modifyingFile: TFile

  rawFrontmatter: string
  frontmatter: { [key: string]: any }

  isSupportedFile: (file?: TFile) => boolean
  updateFrontmatter: (file: TFile, content: string) => { [ key: string ]: any } | null
  saveFrontmatter: (frontmatter: { [key: string]: any }) => void
}