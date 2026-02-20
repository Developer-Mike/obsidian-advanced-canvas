import { CanvasData, CanvasTextNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { EmbedCache, ExtendedMetadataCache, FrontmatterLinkCache, LinkCache, Notice, TFile } from "obsidian"
import { CanvasFileNodeData } from "src/@types/AdvancedJsonCanvas"
import { ExtendedCachedMetadata, ExtendedEmbedCache, ExtendedLinkCache } from "src/@types/Obsidian"
import AdvancedCanvasPlugin from "src/main"
import FilepathHelper from "src/utils/filepath-helper"
import HashHelper from "src/utils/hash-helper"
import Patcher from "./patcher"

export default class MetadataCachePatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const plugin = this.plugin
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
          return CanvasMetadataHandler.computeFileMetadataAsync.call(this, file)

        return next.call(this, file, ...args)
      }),
      resolveLinks: Patcher.OverrideExisting(next => async function (filepath: string) {
        if (FilepathHelper.extension(filepath) === 'canvas')
          return CanvasMetadataHandler.resolveLinks.call(this, plugin, filepath)

        return next.call(this, filepath)
      })
    })

    // metadataCache.watchVaultChanges makes a copy of computeFileMetadataAsync that gets called on the "modify" event
    // To fix this, AC creates a new event listener for "modify" that only handles canvas files
    this.plugin.registerEvent(this.plugin.app.vault.on('modify', (file: TFile) => {
      if (FilepathHelper.extension(file.path) !== 'canvas') return
      this.plugin.app.metadataCache.computeFileMetadataAsync(file)
    }))
  }
}

class CanvasMetadataHandler {
  static async computeFileMetadataAsync(this: ExtendedMetadataCache, file: TFile) {
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

    if (isStale) await CanvasMetadataHandler.updateMetadataCache.call(this, file)

    this.resolveLinks(file.path)
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

      // FIXME: If workQueue is not empty, don't trigger the "finished" event yet
      if (await Promise.race([
        this.workQueue.promise.then(() => false),
        new Promise(resolve => setTimeout(() => resolve(true), 0))
      ])) this.trigger('finished')
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
    metadata.frontmatter = {
      frontmatterPosition: {
        start: { line: 0, col: 0, offset: 0 },
        end: { line: 0, col: 0, offset: 0 }
      },
      frontmatter: frontmatter,
      frontmatterLinks: []
    }

    // Extract frontmatter links
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

  static resolveLinks(this: ExtendedMetadataCache, plugin: AdvancedCanvasPlugin, filepath: string) {
    // FIXME
  }
}

/* resolve links
// Get file object
const file = this.vault.getAbstractFileByPath(filepath) as TFile
if (!file) return

// Get metadata cache entry
const metadataCache = this.metadataCache[this.fileCache[filepath]?.hash] as ExtendedCachedMetadata
if (!metadataCache) return

// List of all links in the file
const metadataReferences = [...(metadataCache.links || []), ...(metadataCache.embeds || [])]

// Update resolved links
this.resolvedLinks[filepath] = metadataReferences.reduce((acc, metadataReference) => {
  const resolvedLinkpath = this.getFirstLinkpathDest(metadataReference.link, filepath)
  if (!resolvedLinkpath) return acc

  acc[resolvedLinkpath.path] = (acc[resolvedLinkpath.path] || 0) + 1

  return acc
}, {} as Record<string, number>)

// Trigger metadata cache change event
this.trigger('resolve', file)
this.trigger('resolved') // TODO: Use workQueue like in the original function
}),
// FIXME
registerInternalLinkAC: _next => async function (canvasName: string, from: string, to: string) {
// If the "from" node is the same as the "to" node, don't register the link
if (from === to) return

// Get the file object for the "from" node
const fromFile = this.vault.getAbstractFileByPath(from)
if (!fromFile || !(fromFile instanceof TFile)) return

// If the "from" node is not a "md" or "canvas" file, don't register the link
if (!['md', 'canvas'].includes(fromFile.extension)) return

// Update metadata cache for "from" node
const fromFileHash = this.fileCache[from]?.hash ?? await HashHelper.getFileHash(that.plugin, fromFile) // Some files might not be resolved yet
const fromFileMetadataCache = (this.metadataCache[fromFileHash] ?? { v: 1 }) as ExtendedCachedMetadata
this.metadataCache[fromFileHash] = {
  ...fromFileMetadataCache,
  links: [
    ...(fromFileMetadataCache.links || []),
    {
      link: to,
      original: to,
      displayText: `${canvasName} → ${to}`,
      position: {
        start: { line: 0, col: 0, offset: 0 },
        end: { line: 0, col: 0, offset: 0 }
      }
    }
  ]
}

// Update resolved links for "from" node
this.resolvedLinks[from] = {
  ...this.resolvedLinks[from],
  [to]: (this.resolvedLinks[from]?.[to] || 0) + 1
}*/
