import { CachedMetadata, EmbedCache, FrontMatterCache, FrontmatterLinkCache, LinkCache, Pos, TagCache } from "obsidian"
import { CustomWorkspaceEvents } from "./CustomWorkspaceEvents"
import SuggestManager from "./SuggestManager"

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

    commands: any
    internalPlugins: any

    viewRegistry: any
    embedRegistry: EmbedRegistry

    /** @public */
    metadataCache: ExtendedMetadataCache
    /** @public */ // exclude only the on method that takes a string and not a specific event name
    workspace: Omit<Omit<ExtendedWorkspace, 'on'>, 'trigger'> & {
      on<K extends keyof CustomWorkspaceEvents>(name: K, callback: (...args: Parameters<CustomWorkspaceEvents[K]>) => void): EventRef
      trigger<K extends keyof CustomWorkspaceEvents>(name: K, ...args: Parameters<CustomWorkspaceEvents[K]>): void

      // Inbuilt
      on(name: 'quick-preview', callback: (file: TFile, data: string) => any, ctx?: any): EventRef
      on(name: 'resize', callback: () => any, ctx?: any): EventRef
      on(name: 'active-leaf-change', callback: (leaf: WorkspaceLeaf | null) => any, ctx?: any): EventRef
      on(name: 'file-open', callback: (file: TFile | null) => any, ctx?: any): EventRef
      on(name: 'layout-change', callback: () => any, ctx?: any): EventRef
      on(name: 'window-open', callback: (win: WorkspaceWindow, window: Window) => any, ctx?: any): EventRef
      on(name: 'window-close', callback: (win: WorkspaceWindow, window: Window) => any, ctx?: any): EventRef
      on(name: 'css-change', callback: () => any, ctx?: any): EventRef
      on(name: 'file-menu', callback: (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => any, ctx?: any): EventRef
      on(name: 'files-menu', callback: (menu: Menu, files: TAbstractFile[], source: string, leaf?: WorkspaceLeaf) => any, ctx?: any): EventRef
      on(name: 'url-menu', callback: (menu: Menu, url: string) => any, ctx?: any): EventRef
      on(name: 'editor-menu', callback: (menu: Menu, editor: Editor, info: MarkdownView | MarkdownFileInfo) => any, ctx?: any): EventRef
      on(name: 'editor-change', callback: (editor: Editor, info: MarkdownView | MarkdownFileInfo) => any, ctx?: any): EventRef
      on(name: 'editor-paste', callback: (evt: ClipboardEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo) => any, ctx?: any): EventRef
      on(name: 'editor-drop', callback: (evt: DragEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo) => any, ctx?: any): EventRef
      on(name: 'quit', callback: (tasks: Tasks) => any, ctx?: any): EventRef
    }
  }

  export interface ExtendedWorkspace extends Workspace {
    editorSuggest: {
      suggests: { suggestManager?: SuggestManager }[]
    }
  }

  export interface ExtendedVault extends Vault {
    getMarkdownFiles: () => TFile[]

    // Custom
    recurseChildrenAC: (origin: TAbstractFile, traverse: (file: TAbstractFile) => void) => void
  }

  export interface EmbedRegistry {
    embedByExtension: { [extension: string]: (context: EmbedContext, file: TFile, subpath?: string) => Component }
  }

  export interface EmbedContext {
    app: App
    
    containerEl: HTMLElement
    sourcePath?: string
    linktext?: string
    
    displayMode?: boolean
    showInline?: boolean
    depth?: number
  }

  export interface ExtendedMetadataCache extends MetadataCache {
    vault: ExtendedVault

    workQueue: {
      promise: Promise<void>
    }

    fileCache: FileCache
    metadataCache: MetadataCacheMap
    resolvedLinks: ResolvedLinks
    uniqueFileLookup: {
      get: (name: string) => TFile[]
      add: (name: string, file: TFile) => void
    }

    computeMetadataAsync: (buffer: ArrayBuffer) => Promise<ExtendedCachedMetadata>

    computeFileMetadataAsync: (file: TFile) => void
    saveFileCache: (filepath: string, cache: FileCacheEntry) => void
    linkResolver: () => void
    resolveLinks: (filepath: string, /* custom */ cachedContent: any) => void

    // Custom
    registerInternalLinkAC: (canvasName: string, from: string, to: string) => void
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

export interface MetadataCacheMap {
  [hash: string]: ExtendedCachedMetadata
}

export interface ExtendedCachedMetadata extends CachedMetadata {
  links?: LinkCache[]
  embeds?: EmbedCache[]
  nodes?: NodesCache
  v: number
}

export interface NodesCache {
  [nodeId: string]: CachedMetadata
}

export interface ResolvedLinks {
  [path: string]: {
    [link: string]: number
  }
}