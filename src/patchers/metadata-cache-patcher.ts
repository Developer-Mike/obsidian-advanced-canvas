import { CanvasData, CanvasTextNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { FrontmatterLinkCache, MetadataCache, Notice, TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { ExtendedCachedMetadata, ExtendedEmbedCache, ExtendedLinkCache } from "src/@types/Obsidian"
import FilepathHelper from "src/utils/filepath-helper"
import HashHelper from "src/utils/hash-helper"
import TaskQueue from "src/utils/task-queue"
import Patcher, { invoke } from "./patcher"

export default class MetadataCachePatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    Patcher.patchPrototype<MetadataCache>(this.plugin, this.plugin.app.metadataCache, {
      getCache: Patcher.OverrideExisting(next => function (filepath: string, ...args: unknown[]): ExtendedCachedMetadata | null {
        // Bypass the "md" extension check by handling the "canvas" extension here
        if (FilepathHelper.extension(filepath) === 'canvas') {
          if (!Object.prototype.hasOwnProperty.call(this.fileCache, filepath))
            return null

          const hash = this.fileCache[filepath]?.hash
          return (hash && this.metadataCache[hash] as ExtendedCachedMetadata) || null
        }

        return invoke(next, this, filepath, ...args) as ExtendedCachedMetadata
      }),
      computeFileMetadataAsync: Patcher.OverrideExisting(next => async function (file: TFile, ...args: unknown[]) {
        if (file instanceof TFile && file?.extension === 'canvas')
          return invoke(computeCanvasFileMetadataAsync, this, file)

        return invoke(next, this, file, ...args)
      }),
      resolveLinks: Patcher.OverrideExisting(next => async function (filepath: string) {
        const result = invoke(next, this, filepath)

        // Run custom logic that triggers 'resolve' and 'resolved' events
        if (FilepathHelper.extension(filepath) === 'canvas')
          await invoke(resolveCanvasLinks, this, filepath)

        return result
      })
    })
  }
}

const metadataQueue = new TaskQueue()
const linkResolveQueue = new TaskQueue()

async function computeCanvasFileMetadataAsync(this: MetadataCache, file: TFile) {
  this.uniqueFileLookup.add(file.name.toLowerCase(), file)

  let isStale = true
  const cache = this.fileCache[file.path]
  if (!cache) this.saveFileCache(file.path, { mtime: 0, size: 0, hash: "" })
  else {
    const unchanged = cache.mtime === file.stat.mtime && cache.size === file.stat.size
    const hasMetadataCache = cache.hash && Object.prototype.hasOwnProperty.call(this.metadataCache, cache.hash) as unknown as boolean

    if (unchanged && hasMetadataCache)
      isStale = false
  }

  if (isStale) {
    linkResolveQueue.setOnFinished(() => this.trigger('finished'))
    await metadataQueue.add(
      () => invoke(updateMetadataCache, this, file)
    )
  }

  linkResolveQueue.setOnFinished(() => this.trigger('resolved'))
  await linkResolveQueue.add(
    () => invoke(resolveCanvasLinks, this, file.path)
  )
}

async function updateMetadataCache(this: MetadataCache, file: TFile) {
  const bytes = await this.vault.readBinary(file)
  const data = new TextDecoder().decode(new Uint8Array(bytes))
  const hash = await HashHelper.getBytesHash(bytes)

  const cache = {
    mtime: file.stat.mtime,
    size: file.stat.size,
    hash: hash
  }
  this.saveFileCache(file.path, cache)

  let metadata = this.metadataCache[cache.hash] as ExtendedCachedMetadata | undefined
  if (metadata) return this.trigger(
    "changed", file, data, metadata
  )

  const slowIndexingTimeout = window.setTimeout(() => {
    new Notice(`Canvas indexing taking a long time for file ${file.path}`)
  }, 10000)

  try {
    metadata = await invoke(computeCanvasMetadataAsync, this, data)
  } finally {
    window.clearTimeout(slowIndexingTimeout)
  }

  if (metadata) {
    this.saveMetaCache(hash, metadata)
    this.trigger("changed", file, data, metadata)
  } else {
    console.error("Canvas metadata failed to parse", file)
  }
}

async function computeCanvasMetadataAsync(this: MetadataCache, data: string): Promise<ExtendedCachedMetadata> {
  const content = JSON.parse(data || '{}') as Partial<CanvasData>
  const metadata = {
    v: 1
  } as Partial<ExtendedCachedMetadata>

  const frontmatter = content.metadata?.frontmatter
  metadata.frontmatterPosition = {
    start: { line: 0, col: 0, offset: 0 },
    end: { line: 0, col: 0, offset: 0 }
  }
  metadata.frontmatter = frontmatter

  metadata.frontmatterLinks = []
  for (const [key, value] of Object.entries(frontmatter ?? {})) {
    const getLinks = (value: string[]) => value.map((v) => {
      if (!v.startsWith('[[') || !v.endsWith(']]')) return null
      const [link, ...aliases] = v.slice(2, -2).split('|')

      return {
        key: key,
        displayText: aliases.length > 0 ? aliases.join('|') : link,
        link: link ?? v,
        original: v
      } satisfies FrontmatterLinkCache
    }).filter((v) => v !== null) as FrontmatterLinkCache[]

    if (typeof value === 'string') metadata.frontmatterLinks?.push(...getLinks([value]))
    else if (Array.isArray(value)) metadata.frontmatterLinks?.push(...getLinks(value as string[]))
  }

  metadata.nodes = {}
  metadata.links = []
  metadata.embeds = []
  await Promise.all((content.nodes ?? []).map(async (node, index) => {
    if (node.type !== 'text') return

    const text = (node as CanvasTextNodeData).text
    const buffer = new TextEncoder().encode(text).buffer
    const nodeMetadata = await this.computeMetadataAsync(buffer)
    if (!nodeMetadata) return

    metadata.nodes![node.id] = nodeMetadata
    metadata.links!.push(...(nodeMetadata.links ?? []).map(link => ({
      ...link,
      position: {
        nodeId: node.id,
        start: { line: 0, col: 1, offset: 0 },
        end: { line: 0, col: 1, offset: index }
      }
    } satisfies ExtendedLinkCache)))
    metadata.embeds!.push(...(nodeMetadata.embeds ?? []).map(embed => ({
      ...embed,
      position: {
        nodeId: node.id,
        start: { line: 0, col: 1, offset: 0 },
        end: { line: 0, col: 1, offset: index }
      }
    }) satisfies ExtendedEmbedCache))
  }))

  for (const [index, node] of (content.nodes ?? []).entries()) {
    if (node.type !== 'file') continue

    const file = (node as CanvasFileNodeData).file
    if (!file) continue

    metadata.embeds.push({
      link: file,
      original: file,
      displayText: file,
      position: {
        start: { line: 0, col: 1, offset: 0 },
        end: { line: 0, col: 1, offset: index }
      }
    })
  }

  return metadata as ExtendedCachedMetadata
}

async function resolveCanvasLinks(this: MetadataCache, filepath: string) {
  const file = this.vault.getAbstractFileByPath(filepath)
  if (!(file instanceof TFile)) return

  const metadata = this.getFileCache(file)
  const references = [...(metadata?.links ?? []), ...(metadata?.embeds ?? [])]
  const referenceLinks = references.map(ref => ref.link).sort()

  const resolvedLinks: Record<string, number> = {}
  const unresolvedLinks: Record<string, number> = {}

  for (const link of referenceLinks) {
    const resolved = this.getFirstLinkpathDest(link, filepath)

    if (resolved) {
      resolvedLinks[resolved.path] ??= 0
      resolvedLinks[resolved.path]++
    } else {
      const strippedLink = link.endsWith('.md') ? link.slice(0, -3) : link

      unresolvedLinks[strippedLink] ??= 0
      unresolvedLinks[strippedLink]++
    }
  }

  this.resolvedLinks[filepath] = resolvedLinks
  this.unresolvedLinks[filepath] = unresolvedLinks

  await sleep(1)
  this.trigger('resolve', file)
}
