import { Pos } from "obsidian"

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

    computeFileMetadataAsync: (file: TFile) => void
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

export interface CanvasPos extends Pos {
  nodeId: string
}

export interface MetadataCacheMap {
  [hash: string]: MetadataCacheEntry
}

export interface MetadataCacheEntry {
  links?: {
    link: string
    original: string
    displayText: string
    position: Pos | CanvasPos
  }[]
  embeds?: {
    link: string
    original: string
    displayText: string
    position: Pos | CanvasPos
  }[]
  headings?: { 
    heading: string
    level: number
    position: Pos | CanvasPos
  }[]
  listItems?: {
    parent: number
    position: Pos | CanvasPos
  }[]
  sections?: {
    type: "paragraph" | "list" | "heading"
    position: Pos | CanvasPos
  }[]
  v: number
}

export interface ResolvedLinks {
  [path: string]: {
    [link: string]: number
  }
}