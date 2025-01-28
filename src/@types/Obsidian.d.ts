export * from "obsidian"

declare module "obsidian" {
  export default interface App {
    /** @public */
    keymap: Keymap
    /** @public */
    scope: Scope
    /** @public */
    vault: Vault
    /** @public */
    fileManager: FileManager
    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: UserEvent | null

    internalPlugins: any

    // Custom
    /** @public */
    metadataCache: ExtendedMetadataCache
    /** @public */
    workspace: Workspace & ExtendedWorkspace
  }

  export interface ExtendedMetadataCache extends MetadataCache {
    fileCache: FileCache
    metadataCache: MetadataCacheMap
    resolvedLinks: ResolvedLinks

    onCreateOrModify: (file: TFile) => void
    saveFileCache: (filepath: string, cache: FileCacheEntry) => void
    linkResolver: () => void
    resolveLinks: (filepath: string) => void
  }

  export interface ExtendedWorkspace {
    on(name: string, callback: (...args: any) => void): EventRef
  }

  export interface EventRef {
    fn: (...args: any) => any
  }
}

export interface FileCache {
  [path: string]: FileCacheEntry
}

export interface FileCacheEntry {
  hash: string
  mtime: number
  size: number
}

interface Position {
  line: number
  col: number
  offset: number
}

interface PositionRange {
  start: Position
  end: Position
}

export interface MetadataCacheMap {
  [hash: string]: MetadataCacheEntry
}

export interface MetadataCacheEntry {
  embeds?: {
    link: string
    original: string
    displayText: string
    position: PositionRange
  }[]
  headings?: { 
    heading: string
    level: number
    position: PositionRange
  }[]
  listItems?: {
    parent: number
    position: PositionRange
  }[]
  sections?: {
    type: "paragraph" | "list" | "heading"
    position: PositionRange
  }[]
  v: number
}

export interface ResolvedLinks {
  [path: string]: {
    [link: string]: number
  }
}