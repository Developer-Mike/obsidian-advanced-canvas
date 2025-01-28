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
    fileCache: { [path: string]: FileCacheEntry }
    metadataCache: { [hash: string]: MetadataCacheEntry }
    onCreateOrModify: (file: TFile) => void
    saveFileCache: (filepath: string, cache: FileCacheEntry) => void // Called in onCreateOrModify
    linkResolver: () => void
    resolveLinks: (filepath: string) => void // Called in linkResolver
  }

  export interface ExtendedWorkspace {
    on(name: string, callback: (...args: any) => void): EventRef
  }

  export interface EventRef {
    fn: (...args: any) => any
  }
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