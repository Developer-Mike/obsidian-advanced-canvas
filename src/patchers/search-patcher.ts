import SearchView, { MatchData, SearchQuery } from "src/@types/SearchPlugin"
import Patcher, { invoke } from "./patcher"

export default class SearchPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    await Patcher.waitForViewRequest<SearchView>(this.plugin, "search", view => {
      // Patch the search view until the searchQuery is set or the plugin is unloaded
      const uninstallers: (() => void)[] = []
      Patcher.patchThisAndPrototype(this.plugin, view, {
        startSearch: next => function (...args: Parameters<typeof next>): void {
          const result = invoke(next, this, ...args)

          // Patch the searchQuery and revert the search view patch
          if (this.searchQuery) {
            that.patchSearchQuery(this.searchQuery)
            uninstallers.forEach(uninstall => uninstall())
          }

          return result
        }
      }, uninstallers)
    })
  }

  private patchSearchQuery(searchQuery: SearchQuery) {
    Patcher.patchThisAndPrototype(this.plugin, searchQuery, {
      _match: Patcher.OverrideExisting(next => function (data: MatchData): unknown {
        const isCanvas = data.strings.filepath?.endsWith(".canvas") ?? false

        if (isCanvas && !data.cache)
          data.cache = this.app.metadataCache.getCache(data.strings.filepath)

        return invoke(next, this, data)
      })
    })
  }
}
