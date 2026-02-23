import { CanvasData, CanvasTextNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { ExtendedMetadataCache, FrontmatterLinkCache, Notice, TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { ExtendedCachedMetadata, ExtendedEmbedCache, ExtendedLinkCache } from "src/@types/Obsidian"
import FilepathHelper from "src/utils/filepath-helper"
import HashHelper from "src/utils/hash-helper"
import TaskQueue from "src/utils/task-queue"
import Patcher from "./patcher"

export default class MetadataCachePatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    Patcher.patchPrototype<ExtendedMetadataCache>(this.plugin, this.plugin.app.metadataCache, {
      getCache: Patcher.OverrideExisting(next => function (filepath: string, ...args: any[]): ExtendedCachedMetadata | null {
        // Bypass the "md" extension check by handling the "canvas" extension here
        if (FilepathHelper.extension(filepath) === 'canvas') {
          if (!this.fileCache.hasOwnProperty(filepath)) return null

          const hash = this.fileCache[filepath].hash
          return this.metadataCache[hash] || null
        }

        return next.call(this, filepath, ...args)
      }),
      computeFileMetadataAsync: Patcher.OverrideExisting(next => async function (file: TFile, ...args: any[]) {
        if (file instanceof TFile && file?.extension === 'canvas')
          return CanvasMetadataHandler.computeCanvasFileMetadataAsync.call(this, file)

        return next.call(this, file, ...args)
      }),
      resolveLinks: Patcher.OverrideExisting(next => async function (filepath: string) {
        const result = next.call(this, filepath)

        // Run custom logic that triggers 'resolve' and 'resolved' events
        if (FilepathHelper.extension(filepath) === 'canvas')
          CanvasMetadataHandler.resolveCanvasLinks.call(this, filepath)

        return result
      })
    })
  }
}

class CanvasMetadataHandler {
  static metadataQueue: TaskQueue = new TaskQueue()
  static linkResolveQueue: TaskQueue = new TaskQueue()

  static async computeCanvasFileMetadataAsync(this: ExtendedMetadataCache, file: TFile) {
    // Add file to uniqueFileLookup
    this.uniqueFileLookup.add(file.name.toLowerCase(), file)

    // Check if cache is stale
    let isStale = true
    if (!this.fileCache.hasOwnProperty(file.path))
      this.saveFileCache(file.path, { mtime: 0, size: 0, hash: "" })
    else {
      const cache = this.fileCache[file.path]

      const unchanged = cache.mtime === file.stat.mtime && cache.size === file.stat.size
      const hasMetadataCache = cache.hash && this.metadataCache.hasOwnProperty(cache.hash)

      if (unchanged && hasMetadataCache)
        isStale = false
    }

    if (isStale) {
      CanvasMetadataHandler.linkResolveQueue.setOnFinished(() => this.trigger('finished'))
      await CanvasMetadataHandler.metadataQueue.add(
        () => CanvasMetadataHandler.updateMetadataCache.call(this, file)
      )
    }

    CanvasMetadataHandler.linkResolveQueue.setOnFinished(() => this.trigger('resolved'))
    await CanvasMetadataHandler.linkResolveQueue.add(
      () => CanvasMetadataHandler.resolveCanvasLinks.call(this, file.path)
    )
  }

  static async updateMetadataCache(this: ExtendedMetadataCache, file: TFile) {
    const bytes = await this.vault.readBinary(file)
    const data = new TextDecoder().decode(new Uint8Array(bytes))
    const hash = await HashHelper.getBytesHash(bytes)

    // Update cache
    const cache = {
      mtime: file.stat.mtime,
      size: file.stat.size,
      hash: hash
    }
    this.saveFileCache(file.path, cache)

    // Check if metadata already exists for the hash
    let metadata = this.metadataCache[cache.hash]
    if (metadata) return this.trigger(
      "changed", file, data, metadata
    )

    const slowIndexingTimeout = setTimeout(() => {
      new Notice(`Canvas indexing taking a long time for file ${file.path}`)
    }, 10000)

    try {
      metadata = await CanvasMetadataHandler.computeCanvasMetadataAsync.call(this, data)
    } finally {
      clearTimeout(slowIndexingTimeout)
    }

    if (metadata) {
      this.saveMetaCache(hash, metadata)
      this.trigger("changed", file, data, metadata)
    } else {
      console.log("Canvas metadata failed to parse", file)
    }
  }

  static async computeCanvasMetadataAsync(this: ExtendedMetadataCache, data: string): Promise<ExtendedCachedMetadata> {
    const content = JSON.parse(data || '{}') as Partial<CanvasData>
    const metadata = {
      v: 1
    } as Partial<ExtendedCachedMetadata>

    // Create frontmatter metadata entry
    const frontmatter = content.metadata?.frontmatter
    metadata.frontmatterPosition = {
      start: { line: 0, col: 0, offset: 0 },
      end: { line: 0, col: 0, offset: 0 }
    }
    metadata.frontmatter = frontmatter

    // Extract frontmatter links
    metadata.frontmatterLinks = []
    for (const [key, value] of Object.entries(frontmatter ?? {})) {
      const getLinks = (value: string[]) => value.map((v) => {
        if (!v.startsWith('[[') || !v.endsWith(']]')) return null // Frontmatter only supports wikilinks
        const [link, ...aliases] = v.slice(2, -2).split('|')

        return {
          key: key,
          displayText: aliases.length > 0 ? aliases.join('|') : link,
          link: link,
          original: v
        } satisfies FrontmatterLinkCache
      }).filter((v) => v !== null) as FrontmatterLinkCache[]

      if (typeof value === 'string') metadata.frontmatterLinks?.push(...getLinks([value]))
      else if (Array.isArray(value)) metadata.frontmatterLinks?.push(...getLinks(value))
    }

    // Add text node entries, links and embeds in parallel
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
          start: { line: 0, col: 1, offset: 0 }, // 0 for node
          end: { line: 0, col: 1, offset: index } // index of node
        }
      } satisfies ExtendedLinkCache)))
      metadata.embeds!.push(...(nodeMetadata.embeds ?? []).map(embed => ({
        ...embed,
        position: {
          nodeId: node.id,
          start: { line: 0, col: 1, offset: 0 }, // 0 for node
          end: { line: 0, col: 1, offset: index } // index of node
        }
      }) as ExtendedEmbedCache))
    }))

    // Add file nodes as embeds
    for (const [index, node] of (content.nodes ?? []).entries()) {
      if (node.type !== 'file') continue

      const file = (node as CanvasFileNodeData).file!
      if (!file) continue

      metadata.embeds.push({
        link: file,
        original: file,
        displayText: file,
        position: {
          start: { line: 0, col: 1, offset: 0 }, // 0 for nodes
          end: { line: 0, col: 1, offset: index } // index of node
        }
      })
    }

    return metadata as ExtendedCachedMetadata
  }

  static async resolveCanvasLinks(this: ExtendedMetadataCache, filepath: string) {
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
}
