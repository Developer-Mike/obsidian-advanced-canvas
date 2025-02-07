import { ExtendedMetadataCache, TFile } from "obsidian"
import { CanvasData, CanvasNodeData } from "src/@types/Canvas"
import { ExtendedCachedMetadata, MetadataCacheMap } from "src/@types/Obsidian"
import HashHelper from "src/utils/hash-helper"
import PatchHelper from "src/utils/patch-helper"
import PathHelper from "src/utils/path-helper"
import Patcher from "./patcher"

export default class MetadataCachePatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    PatchHelper.patchPrototype<ExtendedMetadataCache>(this.plugin, this.plugin.app.metadataCache, {
      getCache: PatchHelper.OverrideExisting(next => function (filepath: string, ...args: any[]): ExtendedCachedMetadata | null {
        // Bypass the "md" extension check by handling the "canvas" extension here
        if (PathHelper.extension(filepath) === 'canvas') {
          if (!this.fileCache.hasOwnProperty(filepath)) return null
          
          const hash = this.fileCache[filepath].hash
          return this.metadataCache[hash] || null
        }

        return next.call(this, filepath, ...args)
      }),
      computeFileMetadataAsync: PatchHelper.OverrideExisting(next => async function (file: TFile, ...args: any[]) {
        // Call the original function if the file is not a canvas file
        if (PathHelper.extension(file.path) !== 'canvas')
          return next.call(this, file, ...args)

        // Update the cache
        const fileHash = HashHelper.hash(file.path)
        this.saveFileCache(file.path, {
          hash: fileHash, // Hash wouldn't get set in the original function
          mtime: file.stat.mtime,
          size: file.stat.size
        })

        // TODO: Use workQueue like in the original function
        // Read canvas data
        const content = JSON.parse(await this.vault.cachedRead(file) ?? '{}') as CanvasData
        if (!content?.nodes) return

        // Extract canvas file node embeds
        const fileNodesEmbeds = content.nodes
          .filter((node: CanvasNodeData) => node.type === 'file' && node.file)
          .map((node: CanvasNodeData) => [node.id, node.file] as [string, string])
          .map(([nodeId, file]) => ({
            link: file,
            original: file,
            displayText: file,
            position: {
              nodeId: nodeId,
              start: { line: 0, col: 0, offset: 0 },
              end: { line: 0, col: 0, offset: 0 }
            }
          }))

        // Extract canvas text node links/embeds
        const textEncoder = new TextEncoder()
        const textNodes = content.nodes
          .filter((node: CanvasNodeData) => node.type === 'text' && node.text)

        const textNodesIds = textNodes
          .map((node: CanvasNodeData) => node.id)

        const textNodesMetadataPromises = textNodes
          .map((node: CanvasNodeData) => textEncoder.encode(node.text).buffer)
          .map((buffer: ArrayBuffer) => this.computeMetadataAsync(buffer) as Promise<ExtendedCachedMetadata>)
        const textNodesMetadata = await Promise.all(textNodesMetadataPromises) // Wait for all text nodes to be resolved

        const textNodesEmbeds = textNodesMetadata
          .map((metadata: ExtendedCachedMetadata, index: number) => (
            (metadata.embeds || []).map(embed => ({
              ...embed,
              position: {
                nodeId: textNodesIds[index],
                ...embed.position
              }
            }))
          )).flat()

        const textNodesLinks = textNodesMetadata
          .map((metadata: ExtendedCachedMetadata, index: number) => (
            (metadata.links || []).map(link => ({
              ...link,
              position: {
                nodeId: textNodesIds[index],
                ...link.position
              }
            }))
          )).flat()

        // Update metadata cache
        ;(this.metadataCache as MetadataCacheMap)[fileHash] = {
          v: 1,
          embeds: [
            ...fileNodesEmbeds,
            ...textNodesEmbeds
          ],
          links: [
            ...textNodesLinks
          ],
          nodes: {
            ...textNodesMetadata.reduce((acc, metadata, index) => {
              acc[textNodesIds[index]] = metadata
              return acc
            }, {} as Record<string, ExtendedCachedMetadata>)
          }
        } satisfies ExtendedCachedMetadata

        // Trigger metadata cache change event
        this.trigger('changed', file, "", this.metadataCache[fileHash])

        // Resolve links (This wouldn't get called in the original function too)
        this.resolveLinks(file.path, content)
      }),
      resolveLinks: PatchHelper.OverrideExisting(next => async function (filepath: string, cachedContent: Partial<CanvasData>) { // Custom argument cachedContent
        // Call the original function if the file is not a canvas file
        if (PathHelper.extension(filepath) !== 'canvas')
          return next.call(this, filepath)

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

        // Show links between files with edges
        if (that.plugin.settings.getSetting('treatFileNodeEdgesAsLinks')) {
          // Extract canvas file edges
          for (const edge of cachedContent.edges || []) {
            const from = cachedContent.nodes?.find((node: CanvasNodeData) => node.id === edge.fromNode)
            const to = cachedContent.nodes?.find((node: CanvasNodeData) => node.id === edge.toNode)
            if (!from || !to) continue

            // Check if both nodes are file nodes
            if (from.type !== 'file' || to.type !== 'file' || !from.file || !to.file) continue

            // Register the link for the "from" node to the "to" node
            this.registerInternalLinkAC(file.name, from.file, to.file)

            // Check if the edge is bidirectional or unidirectional - if yes, register the link for the "to" node to the "from" node as well
            if (!(edge.toEnd !== 'none' || edge.fromEnd === 'arrow'))
              this.registerInternalLinkAC(file.name, to.file, from.file)
          }
        }

        // Trigger metadata cache change event
        this.trigger('resolve', file)
        this.trigger('resolved') // TODO: Use workQueue like in the original function
      }),
      registerInternalLinkAC: _next => function (canvasName: string, from: string, to: string) {
        // If the "from" node is the same as the "to" node, don't register the link
        if (from === to) return

        // If the "from" node is not a "md" or "canvas" file, don't register the link
        if (!['md', 'canvas'].includes(PathHelper.extension(from) ?? '')) return

        // Update metadata cache for "from" node
        const fromFileHash = this.fileCache[from]?.hash ?? HashHelper.hash(from) // Some files might not be resolved yet
        const fromFileMetadataCache = (this.metadataCache[fromFileHash] ?? { v: 1 }) as ExtendedCachedMetadata
        this.metadataCache[fromFileHash] = {
          ...fromFileMetadataCache,
          links: [
            ...(fromFileMetadataCache.links || []),
            {
              link: to,
              original: to,
              displayText: `${canvasName} → ${to}`,
              position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } }
            }
          ]
        }
    
        // Update resolved links for "from" node
        this.resolvedLinks[from] = {
          ...this.resolvedLinks[from],
          [to]: (this.resolvedLinks[from]?.[to] || 0) + 1
        }
      }
    })

    // metadataCache.watchVaultChanges makes a copy of computeFileMetadataAsync that gets called on the "modify" event
    // To fix this, AC creates a new event listener for "modify" that only handles canvas files
    this.plugin.registerEvent(this.plugin.app.vault.on('modify', (file: TFile) => {
      if (PathHelper.extension(file.path) !== 'canvas') return
      this.plugin.app.metadataCache.computeFileMetadataAsync(file)
    }))
  }
}