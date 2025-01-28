import { TAbstractFile, TFile } from "obsidian"
import { CanvasData, CanvasNodeData } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import HashHelper from "src/utils/hash-helper"
import PatchHelper from "src/utils/patch-helper"
import PathHelper from "src/utils/path-helper"

export default class CanvasLinkObsidianExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settings.getSetting('canvasLinksFeatureEnabled')) return

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
      resolveLinks: (next: any) => async function (filepath: string, ...args: any[]) {
        // Call the original function if the file is not a canvas file
        if (PathHelper.extension(filepath) !== 'canvas')
          return next.call(this, filepath, ...args)

        // Get canvas file
        const file = this.vault.getAbstractFileByPath(filepath)
        if (!(file instanceof TFile)) return

        // Read canvas data
        const content = JSON.parse(await this.vault.cachedRead(file) ?? '{}') as CanvasData
        if (!content?.nodes) return

        // Show links to embedded files
        if (that.plugin.settings.getSetting('showLinksToEmbeddedFiles')) {
          for (const node of content.nodes) {
            if (node.type !== 'file' || !node.file) continue

            this.resolvedLinks[file.path] = {
              ...this.resolvedLinks[file.path],
              [node.file]: (this.resolvedLinks[file.path]?.[node.file] || 0) + 1
            }
          }
        }

        ////////////////////////// 
        const fileHash = HashHelper.hash(file.path)
        this.fileCache[file.path].hash = fileHash

        this.metadataCache[fileHash] = {
          embeds: Object.entries(this.resolvedLinks[file.path] ?? {}).map(([path, count]) => ({
            link: path,
            original: path,
            displayText: `${path} (${count})`,
            position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 0, offset: 0 } },
          })),
          v: 1
        }
        //////////////////////////

        // Show links between files with edges
        if (!that.plugin.settings.getSetting('showLinksBetweenFileNodesInGraph')) return
        // Linking between markdown files already handled by the markdown files
        if (that.plugin.settings.getSetting('showLinksBetweenFileNodesInProperties')) return
        
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

    // Add event listeners to update the links when a file is created or modified - metadataCache.linkResolver only resolves md files
    this.plugin.registerEvent(this.plugin.app.vault.on(
      'create',
      (file: TAbstractFile) => file.path.endsWith(".canvas") ? this.plugin.app.metadataCache.resolveLinks(file.path) : null
    ))

    this.plugin.registerEvent(this.plugin.app.vault.on(
      'modify',
      (file: TAbstractFile) => file.path.endsWith(".canvas") ? this.plugin.app.metadataCache.resolveLinks(file.path) : null
    ))
  }
}