import { App, CachedMetadata, TFile } from "./Obsidian"

export default interface SuggestManager {
  app: App

  getSourcePath: () => string
  getHeadingSuggestions: (context: App, path: string, subpath: string) => Promise<Suggestion[]>
}

export interface Suggestion {
  file: TFile
  heading: string
  level: number
  matches: [number, number][]

  path: string
  subpath: string

  score: number
  type: "heading"
}