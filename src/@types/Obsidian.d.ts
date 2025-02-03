import { CachedMetadata, EmbedCache, LinkCache, Pos } from "obsidian"

export * from "obsidian"

declare module "obsidian" {
  export default interface App {
    /** @public */
    keymap: Keymap
    /** @public */
    scope: Scope
    /** @public */
    vault: ExtendedVault
    /** @public */
    fileManager: FileManager
    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: UserEvent | null

    internalPlugins: any

    /** @public */
    metadataCache: ExtendedMetadataCache
    /** @public */
    workspace: Workspace & ExtendedWorkspace
  }

  export interface ExtendedVault extends Vault {
    getMarkdownFiles: () => TFile[]

    // Custom
    recurseChildrenAC: (origin: TAbstractFile, traverse: (file: TAbstractFile) => void) => void
  }

  export interface ExtendedMetadataCache extends MetadataCache {
    vault: ExtendedVault

    fileCache: FileCache
    metadataCache: MetadataCacheMap
    resolvedLinks: ResolvedLinks

    computeMetadataAsync: (buffer: ArrayBuffer) => Promise<ExtendedCachedMetadata>

    computeFileMetadataAsync: (file: TFile) => void
    saveFileCache: (filepath: string, cache: FileCacheEntry) => void
    linkResolver: () => void
    resolveLinks: (filepath: string, /* custom */ cachedContent: any) => void

    // Custom
    registerInternalLinkAC: (canvasName: string, from: string, to: string) => void
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
  [hash: string]: ExtendedCachedMetadata
}

export interface ExtendedCachedMetadata extends CachedMetadata {
  links?: ExtendedLinkCache[]
  embeds?: ExtendedEmbedCache[]
  nodes?: NodesCache
  v: number
}

export interface ExtendedEmbedCache extends EmbedCache {
  position: Pos | CanvasPos
}

export interface ExtendedLinkCache extends LinkCache {
  position: Pos | CanvasPos
}

export interface NodesCache {
  [nodeId: string]: CachedMetadata
}

export interface ResolvedLinks {
  [path: string]: {
    [link: string]: number
  }
}