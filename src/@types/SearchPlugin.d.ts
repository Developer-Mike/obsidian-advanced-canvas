import { App, CachedMetadata } from "obsidian"

export default interface SearchView {
  searchQuery: SearchQuery
  startSearch: () => void
}

export interface SearchQuery {
  app: App
  _match: (data: MatchData) => unknown
}

export interface MatchData {
  strings: {
    filename: string
    filepath: string
    content: string
  }

  caseSensitive: boolean
  original: string

  keys: string[]
  cache: CachedMetadata | null

  data: unknown
}
