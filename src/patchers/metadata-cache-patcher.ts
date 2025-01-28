import { TFile } from "obsidian"
import { CanvasData, CanvasNodeData } from "src/@types/Canvas"
import { FileCacheEntry, MetadataCacheEntry, MetadataCacheMap, ResolvedLinks } from "src/@types/Obsidian"
import HashHelper from "src/utils/hash-helper"
import PatchHelper from "src/utils/patch-helper"
import PathHelper from "src/utils/path-helper"
import Patcher from "./patcher"

export default class MetadataCachePatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    PatchHelper.patchObjectPrototype(this.plugin, this.plugin.app.metadataCache, {
      getCache: (next: any) => function (filepath: string, ...args: any[]) {
        // Bypass the "md" extension check by handling the "canvas" extension here
        if (PathHelper.extension(filepath) === 'canvas') {
          if (!this.fileCache.hasOwnProperty(filepath)) return null
          
          const hash = this.fileCache[filepath].hash
          return this.metadataCache[hash] || null
        }

        return next.call(this, filepath, ...args)
      },
      onCreateOrModify: (next: any) => async function (file: TFile, ...args: any[]) {
        // Call the original function if the file is not a canvas file
        if (PathHelper.extension(file.path) !== 'canvas')
          return next.call(this, file, ...args)

        // Update the cache
        this.saveFileCache(file.path, {
          hash: HashHelper.hash(file.path), // Hash wouldn't get set in the original function
          mtime: file.stat.mtime,
          size: file.stat.size
        })

        // Resolve links (This wouldn't get called in the original function too)
        // TODO: Use workQueue like in the original function
        this.resolveLinks(file.path)
      },
      resolveLinks: (next: any) => async function (filepath: string, ...args: any[]) {
        // Call the original function if the file is not a canvas file
        if (PathHelper.extension(filepath) !== 'canvas')
          return next.call(this, filepath, ...args)

        // Get canvas file
        const file = this.vault.getAbstractFileByPath(filepath)
        if (!(file instanceof TFile)) return

        // Get file cache
        const fileCache = this.fileCache[file.path] as FileCacheEntry
        if (!fileCache) return

        // Read canvas data
        const content = JSON.parse(await this.vault.cachedRead(file) ?? '{}') as CanvasData
        if (!content?.nodes) return

        // Extract canvas file nodes
        const nodes = content.nodes.filter((node: CanvasNodeData) => node.type === 'file' && node.file)
        const links = nodes.map((node: CanvasNodeData) => node.file) as string[]

        // Update metadata cache
        ;(this.metadataCache as MetadataCacheMap)[fileCache.hash] = {
          v: 1,
          embeds: links.map((path: string) => ({
            link: path,
            original: path,
            displayText: path,
            position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } },
          }))
        } as MetadataCacheEntry

        // Update resolved links
        ;(this.resolvedLinks as ResolvedLinks)[file.path] = links.reduce((acc, link) => {
          acc[link] = (acc[link] || 0) + 1
          return acc
        }, this.resolvedLinks[file.path] || {})

        // Show links between files with edges
        if (!that.plugin.settings.getSetting('treatFileNodeEdgesAsLinks')) return
        
        for (const edge of content?.edges) {
          const from = content.nodes.find((node: CanvasNodeData) => node.id === edge.fromNode)
          const to = content.nodes.find((node: CanvasNodeData) => node.id === edge.toNode)

          if (!from || !to) continue
          if (from.type !== 'file' || to.type !== 'file' || !from.file || !to.file) continue

          this.resolvedLinks[from.file] = {
            ...this.resolvedLinks[from.file],
            [to.file]: (this.resolvedLinks[from.file]?.[to.file] || 0) + 1
          }

          if (edge.toEnd === 'none' || edge.fromEnd === 'arrow') {
            this.resolvedLinks[to.file] = {
              ...this.resolvedLinks[to.file],
              [from.file]: (this.resolvedLinks[to.file]?.[from.file] || 0) + 1
            }
          }
        }
      }
    })
  }
}