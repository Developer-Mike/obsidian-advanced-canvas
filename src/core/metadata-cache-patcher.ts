import AdvancedCanvasPlugin from "src/main"
import PatchHelper from "src/utils/patch-helper"
import { TFile } from "obsidian"
import { CanvasData } from "src/@types/Canvas"

export default class MetadataCachePatcher {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.applyPatches()
  }

  private async applyPatches() {
    const that = this

    // Patch metadata cache
    PatchHelper.patchObjectPrototype(this.plugin, this.plugin.app.metadataCache, {
      getCache: (next: any) => function (path: string) {
        let result = next.call(this, path)

        // Also support .canvas files
        if (path.endsWith('.canvas')) {
          if (!this.fileCache.hasOwnProperty(path))
            return null

          const hash = this.fileCache[path].hash
          result = this.metadataCache[hash] || null
        }

        return result
      },
      initialize: (next: any) => function () {
        const result = next.call(this)

        console.log('Initializing metadata cache', this.fileCache)

        return result
      },
      onCreateOrModify: (next: any) => function (file: TFile) {
        const result = next.call(this, file)

        console.log('Computing metadata for', file.path)

        if (file.extension === 'canvas') {
          // Check if the file is already in the cache
          const fileCache = this.fileCache[file.path]
          if (fileCache) {
            const sameMTimeAndSize = fileCache.mtime === file.stat.mtime && fileCache.size === file.stat.size
            const hasMetadata = fileCache.hash && !!this.metadataCache[fileCache.hash]

            if (sameMTimeAndSize && hasMetadata) {
              console.log('Skipping metadata computation for', file.path)
              this.resolveLinks(file.path) // Trigger link resolver

              return result
            }
          }

          console.log('Computing metadata for', file.path)

          // Compute metadata
          this.workQueue.queue(() => that.computeMetadataAsync(this, file))
        }

        return result
      }
    })

    // Patch linkResolverQueue
    PatchHelper.patchObjectPrototype(this.plugin, this.plugin.app.metadataCache.linkResolverQueue, {
      add: (next: any) => function (file: TFile) {
        if (file.extension === 'canvas') that.plugin.app.metadataCache.resolveLinks(file.path)

        return next.call(this, file)
      }
    })
  }

  private async computeMetadataAsync(metadataCache: any, file: TFile) {
    try {
      const fileHash = await this.getHash(file.path)

      // Update file cache
      metadataCache.saveFileCache(file.path, {
        hash: fileHash,
        mtime: file.stat.mtime,
        size: file.stat.size
      })

      // Compute metadata
      const fileContent = await this.plugin.app.vault.cachedRead(file)
      const metadata = (JSON.parse(fileContent) as CanvasData).metadata as any

      metadata.frontmatterLinks = [{
        link: 'Advanced Canvas TODOs',
        displayText: 'Advanced Canvas TODOs',
        key: 'properties',
        original: '[[Advanced Canvas TODOs]]',
      }]

      metadata.tags = [{
        tag: '#todo',
        position: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 1, offset: 0 } },
      }]

      metadata.links = [{
        link: 'Neuseeland Geo',
        displayText: 'Neuseeland Geo',
        position: { start: { line: 22, col: 0, offset: 238 }, end: { line: 22, col: 18, offset: 256 } },
        original: '[[Neuseeland Geo]]'
      }]

      // metadata.embeds

      metadataCache.saveMetaCache(fileHash, metadata)

      // Trigger link resolver
      metadataCache.resolveLinks(file.path)
    } catch (error) { console.error(error) }
  }

  private async getHash(path: string) {
    const msgBuffer = new TextEncoder().encode(path)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
  }
}