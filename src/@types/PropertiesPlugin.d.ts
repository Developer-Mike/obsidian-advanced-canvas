import { App, TFile } from "obsidian"

export default interface PropertiesView {
  app: App
  file: TFile
  modifyingFile: TFile

  rawFrontmatter: string
  frontmatter: Record<string, any>

  isSupportedFile: (file?: TFile) => boolean
  onLoadFile: (file?: TFile) => void
  updateFrontmatter: (file: TFile, content: string) => Record<string, any> | null
  saveFrontmatter: (frontmatter: Record<string, any>) => void

  /** Custom AC property */
  relayCanvasFile?: TFile
}
