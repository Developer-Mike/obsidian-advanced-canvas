import * as obsidian from "obsidian"
import { CustomWorkspaceEvents } from "./CustomWorkspaceEvents"
import SuggestManager from "./SuggestManager"

export * from "obsidian"
declare module "obsidian" {
  export default interface App {
    /** @public */
    keymap: obsidian.Keymap
    /** @public */
    scope: obsidian.Scope
    /** @public */
    vault: ExtendedVault
    /** @public */
    fileManager: obsidian.FileManager
    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: obsidian.UserEvent | null

    commands: any
    internalPlugins: any

    viewRegistry: any
    embedRegistry: obsidian.EmbedRegistry

    /** @public */
    metadataCache: ExtendedMetadataCache
    /** @public */ // exclude only the on method that takes a string and not a specific event name
    workspace: Omit<Omit<ExtendedWorkspace, 'on'>, 'trigger'> & {
      trigger<K extends keyof CustomWorkspaceEvents>(name: K, ...args: Parameters<CustomWorkspaceEvents[K]>): void

      // Inbuilt
      on<K extends keyof CustomWorkspaceEvents>(name: K, callback: (...args: Parameters<CustomWorkspaceEvents[K]>) => void): obsidian.EventRef
      on(name: 'quick-preview', callback: (file: obsidian.TFile, data: string) => any, ctx?: any): obsidian.EventRef
      on(name: 'resize', callback: () => any, ctx?: any): obsidian.EventRef
      on(name: 'active-leaf-change', callback: (leaf: obsidian.WorkspaceLeaf | null) => any, ctx?: any): obsidian.EventRef
      on(name: 'file-open', callback: (file: obsidian.TFile | null) => any, ctx?: any): obsidian.EventRef
      on(name: 'layout-change', callback: () => any, ctx?: any): obsidian.EventRef
      on(name: 'window-open', callback: (win: obsidian.WorkspaceWindow, window: Window) => any, ctx?: any): obsidian.EventRef
      on(name: 'window-close', callback: (win: obsidian.WorkspaceWindow, window: Window) => any, ctx?: any): obsidian.EventRef
      on(name: 'css-change', callback: () => any, ctx?: any): obsidian.EventRef
      on(name: 'file-menu', callback: (menu: obsidian.Menu, file: obsidian.TAbstractFile, source: string, leaf?: obsidian.WorkspaceLeaf) => any, ctx?: any): obsidian.EventRef
      on(name: 'files-menu', callback: (menu: obsidian.Menu, files: obsidian.TAbstractFile[], source: string, leaf?: obsidian.WorkspaceLeaf) => any, ctx?: any): obsidian.EventRef
      on(name: 'url-menu', callback: (menu: obsidian.Menu, url: string) => any, ctx?: any): obsidian.EventRef
      on(name: 'editor-menu', callback: (menu: obsidian.Menu, editor: obsidian.Editor, info: obsidian.MarkdownView | obsidian.MarkdownFileInfo) => any, ctx?: any): obsidian.EventRef
      on(name: 'editor-change', callback: (editor: obsidian.Editor, info: obsidian.MarkdownView | obsidian.MarkdownFileInfo) => any, ctx?: any): obsidian.EventRef
      on(name: 'editor-paste', callback: (evt: ClipboardEvent, editor: obsidian.Editor, info: obsidian.MarkdownView | obsidian.MarkdownFileInfo) => any, ctx?: any): obsidian.EventRef
      on(name: 'editor-drop', callback: (evt: DragEvent, editor: obsidian.Editor, info: obsidian.MarkdownView | obsidian.MarkdownFileInfo) => any, ctx?: any): obsidian.EventRef
      on(name: 'quit', callback: (tasks: obsidian.Tasks) => any, ctx?: any): obsidian.EventRef
    }
  }

  export interface ExtendedWorkspace extends obsidian.Workspace {
    editorSuggest: {
      suggests: { suggestManager?: SuggestManager }[]
    }
  }

  export interface ExtendedVault extends obsidian.Vault {
    getMarkdownFiles: () => obsidian.TFile[]

    // Custom
    recurseChildrenAC: (origin: obsidian.TAbstractFile, traverse: (file: obsidian.TAbstractFile) => void) => void
  }

  export interface EmbedRegistry {
    embedByExtension: { [extension: string]: (context: obsidian.EmbedContext, file: obsidian.TFile, subpath?: string) => obsidian.Component }
  }

  export interface EmbedContext {
    app: obsidian.App

    containerEl: HTMLElement
    sourcePath?: string
    linktext?: string

    displayMode?: boolean
    showInline?: boolean
    depth?: number
  }

  export interface ExtendedMetadataCache extends obsidian.MetadataCache {
    vault: ExtendedVault

    workQueue: {
      promise: Promise<void>
    }

    fileCache: FileCache
    metadataCache: MetadataCacheMap
    resolvedLinks: ResolvedLinks
    uniqueFileLookup: {
      get: (name: string) => obsidian.TFile[]
      add: (name: string, file: obsidian.TFile) => void
    }

    computeMetadataAsync: (buffer: ArrayBuffer) => Promise<ExtendedCachedMetadata>

    computeFileMetadataAsync: (file: obsidian.TFile) => void
    saveFileCache: (filepath: string, cache: FileCacheEntry) => void
    saveMetaCache: (hash: string, cache: ExtendedCachedMetadata) => void
    linkResolver: () => void
    resolveLinks: (filepath: string) => void
    getBacklinksForFile: (file: obsidian.TFile) => { data: Map<string, ExtendedLinkCache[]> }
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

export interface ExtendedCachedMetadata extends obsidian.CachedMetadata {
  links?: ExtendedLinkCache[]
  embeds?: ExtendedEmbedCache[]
  nodes?: NodesCache
  v: number
}

export interface ExtendedPos extends obsidian.Pos {
  nodeId?: string
}

export interface ExtendedLinkCache extends obsidian.LinkCache {
  position: ExtendedPos
}

export interface ExtendedEmbedCache extends obsidian.EmbedCache {
  position: ExtendedPos
}

export interface NodesCache {
  [nodeId: string]: obsidian.CachedMetadata
}

export interface ResolvedLinks {
  [path: string]: {
    [link: string]: number
  }
}
