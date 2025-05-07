import SuggestManager, { Suggestion } from "src/@types/SuggestManager"
import Patcher from "./patcher"
import { TFile } from "obsidian"
import { ExtendedCachedMetadata } from "src/@types/Obsidian"

export default class LinkSuggestionsPatcher extends Patcher {
  async patch() {
    if (!this.plugin.settings.getSetting('enableSingleNodeLinks')) return
    
    const suggestManager = this.plugin.app.workspace.editorSuggest.suggests
      .find(s => s.suggestManager)?.suggestManager
    if (!suggestManager) return console.warn("LinkSuggestionsPatcher: No suggest manager found.")

    const that = this
    Patcher.patchThisAndPrototype<SuggestManager>(this.plugin, suggestManager, {
      getHeadingSuggestions: Patcher.OverrideExisting(next => async function (context: any, path: string, subpath: string) {
        const result = await next.call(this, context, path, subpath) as Suggestion[]

        // Don't add suggestions if the file is not a canvas file
        if (!path.endsWith(".canvas")) return result

        const currentFilePath = this.getSourcePath()

        const targetFile = this.app.metadataCache.getFirstLinkpathDest(path, currentFilePath)
        if (!targetFile) return result

        // Check if file exits and really is a canvas file
        if (!(targetFile instanceof TFile) || targetFile.extension !== "canvas") return result

        const fileCache = this.app.metadataCache.getFileCache(targetFile)
        if (!fileCache) return result

        const canvasNodeCaches = (fileCache as ExtendedCachedMetadata).nodes
        if (!canvasNodeCaches) return result

        // TODO: Better suggestion filtering and display
        for (const [nodeId, nodeCache] of Object.entries(canvasNodeCaches)) {
          if (nodeId === subpath) continue // Skip the current node

          const suggestion: Suggestion = {
            file: targetFile,
            heading: nodeId,
            level: 1,
            matches: [],
            path: path,
            subpath: `#${nodeId}`,
            score: 0,
            type: "heading",
          }

          result.push(suggestion)
        }

        return result
      })
    })
  }
}