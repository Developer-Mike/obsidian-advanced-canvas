import { TFile } from "obsidian"
import { CanvasData, CanvasTextNodeData } from "src/@types/AdvancedJsonCanvas"
import SuggestManager, { Suggestion } from "src/@types/SuggestManager"
import Patcher from "./patcher"

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
        if (!path.endsWith(".canvas")) return result

        const canvasFilePath = this.getSourcePath()
        const canvasFile = this.app.metadataCache.getFirstLinkpathDest(path, canvasFilePath)
        if (!(canvasFile instanceof TFile) || canvasFile.extension !== "canvas") return result

        let data: Partial<CanvasData> | null = null
        try { data = JSON.parse(await that.plugin.app.vault.cachedRead(canvasFile)) }
        catch (e) { }

        for (const nodeData of data?.nodes ?? []) {
          if (nodeData.id === subpath) continue // Skip the current node
          if (nodeData.type !== "text") continue

          const heading = (nodeData as CanvasTextNodeData).text?.substring(0, 30)
          const suggestion: Suggestion = {
            file: canvasFile,
            heading: heading || "Empty Text Node",
            level: 1,
            matches: [],
            path: path,
            subpath: `#${nodeData.id}`,
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
