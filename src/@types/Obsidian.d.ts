import * as obsidian from "obsidian"
import { CustomWorkspaceEvents } from "./CustomWorkspaceEvents"
import type { EmbedContext as EmbedContextType } from "@obsidian-typings/obsidian-public-latest"

export * from "obsidian"
declare module "obsidian" {
  interface Workspace {
    on<K extends keyof CustomWorkspaceEvents>(name: K, callback: (...args: Parameters<CustomWorkspaceEvents[K]>) => void): obsidian.EventRef
    trigger<K extends keyof CustomWorkspaceEvents>(name: K, ...args: Parameters<CustomWorkspaceEvents[K]>): void
  }

  interface Vault {
    recurseChildrenAC: (origin: obsidian.TAbstractFile, traverse: (file: obsidian.TAbstractFile) => void) => void
  }

  export type EmbedContext = EmbedContextType
}

export type ExtendedMetadataCache = obsidian.MetadataCache
export type ExtendedVault = obsidian.Vault

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
