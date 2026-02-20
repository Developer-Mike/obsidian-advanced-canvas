import { ExtendedMetadataCache, TFile } from "obsidian"
import { ExtendedCachedMetadata } from "src/@types/Obsidian"
import AdvancedCanvasPlugin from "src/main"
import FilepathHelper from "src/utils/filepath-helper"
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
          return CanvasMetadataHandler.computeFileMetadataAsync.call(this, plugin, file)

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
  static computeFileMetadataAsync(this: ExtendedMetadataCache, plugin: AdvancedCanvasPlugin, file: TFile) {
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

    if (isStale) CanvasMetadataHandler.updateMetadataCache.call(this, plugin, file)

    this.resolveLinks(file.path)
  }

  static updateMetadataCache(this: ExtendedMetadataCache, plugin: AdvancedCanvasPlugin, file: TFile) {

  }

  static resolveLinks(this: ExtendedMetadataCache, plugin: AdvancedCanvasPlugin, filepath: string) {

  }
}

/* computeMetadata
// Update the cache
const fileHash = await HashHelper.getFileHash(that.plugin, file)
this.saveFileCache(file.path, {
  hash: fileHash, // Hash wouldn't get set in the original function
  mtime: file.stat.mtime,
  size: file.stat.size
})

// Don't use workQueue like in the original function bc it's impossible
// Read canvas data
const content = JSON.parse(await this.vault.cachedRead(file) || '{}') as CanvasData

// Extract frontmatter
const frontmatter = content.metadata?.frontmatter
const frontmatterData = {} as Partial<ExtendedCachedMetadata>
if (frontmatter) {
  frontmatterData.frontmatterPosition = {
    start: { line: 0, col: 0, offset: 0 },
    end: { line: 0, col: 0, offset: 0 }
  }

  frontmatterData.frontmatter = frontmatter

  frontmatterData.frontmatterLinks = Object.entries(frontmatter).flatMap(([key, value]) => {
    const getLinks = (value: string[]) => value.map((v) => {
      if (!v.startsWith('[[') || !v.endsWith(']]')) return null // Frontmatter only supports wikilinks
      const [link, ...aliases] = v.slice(2, -2).split('|')

      return {
        key: key,
        displayText: aliases.length > 0 ? aliases.join('|') : link,
        link: link,
        original: v
      }
    }).filter((v) => v !== null)

    if (typeof value === 'string') return getLinks([value])
    else if (Array.isArray(value)) return getLinks(value)

    return []
  }).filter(v => v !== null) as FrontmatterLinkCache[]
}

// Extract canvas file node embeds
const fileNodesEmbeds = content.nodes
  ?.map((nodeData: CanvasFileNodeData, index) => nodeData.type === 'file' && nodeData.file ? {
    link: nodeData.file,
    original: nodeData.file,
    displayText: nodeData.file,
    position: {
      start: { line: 0, col: 1, offset: 0 }, // 0 for nodes
      end: { line: 0, col: 1, offset: index } // index of node
    }
  } : null)
  ?.filter(entry => entry !== null) ?? []

// Extract canvas text node links/embeds
const textEncoder = new TextEncoder()
const nodesMetadataPromises = content.nodes
  ?.map((node: CanvasTextNodeData) => node.type === "text" ? textEncoder.encode(node.text).buffer : null)
  ?.map((buffer: ArrayBuffer | null) => buffer ? this.computeMetadataAsync(buffer) as Promise<ExtendedCachedMetadata> : Promise.resolve(null)) ?? []
const nodesMetadata = await Promise.all(nodesMetadataPromises) // Wait for all text nodes to be resolved

const textNodesEmbeds = nodesMetadata
  .map((metadata: ExtendedCachedMetadata | null, index: number) => (
    (metadata?.embeds ?? []).map(embed => ({
      ...embed,
      position: {
        nodeId: content.nodes?.[index]?.id,
        start: { line: 0, col: 1, offset: 0 }, // 0 for node
        end: { line: 0, col: 1, offset: index } // index of node
      }
    }))
  )).flat()

const textNodesLinks = nodesMetadata
  .map((metadata: ExtendedCachedMetadata | null, index: number) => (
    (metadata?.links ?? []).map(link => ({
      ...link,
      position: {
        nodeId: content.nodes?.[index]?.id,
        start: { line: 0, col: 1, offset: 0 }, // 0 for node
        end: { line: 0, col: 1, offset: index } // index of node
      }
    }))
  )).flat()

// Update metadata cache
;(this.metadataCache as MetadataCacheMap)[fileHash] = {
  v: 1,
  ...frontmatterData,
  embeds: [
    ...fileNodesEmbeds,
    ...textNodesEmbeds
  ],
  links: [
    ...textNodesLinks
  ],
  nodes: {
    ...nodesMetadata.reduce((acc, metadata, index) => {
      const nodeId = content.nodes?.[index]?.id

      if (nodeId && metadata)
        acc[nodeId] = metadata

      return acc
    }, {} as Record<string, ExtendedCachedMetadata>)
  }
} as ExtendedCachedMetadata

// Trigger metadata cache change event
this.trigger('changed', file, "", this.metadataCache[fileHash])

// If workQueue is not empty, don't trigger the "finished" event yet
if (await Promise.race([this.workQueue.promise.then(() => false), new Promise(resolve => setTimeout(() => resolve(true), 0))]))
  this.trigger('finished', file, "", this.metadataCache[fileHash], true) // (needed for metadataTypeManager)
  */

///////////////////////////////////

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
