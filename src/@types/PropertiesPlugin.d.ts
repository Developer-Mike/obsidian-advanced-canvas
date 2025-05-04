import { TFile } from "obsidian"

export default interface Properties {
  file: TFile

  isSupportedFile: (file?: TFile) => boolean
  saveFrontmatter: (frontmatter: { [key: string]: any }) => void
}