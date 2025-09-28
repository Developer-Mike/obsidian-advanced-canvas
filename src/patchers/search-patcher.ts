import { around } from "monkey-around"
import Patcher from "./patcher"
import SearchView, { MatchData, SearchQuery } from "src/@types/SearchPlugin"

export default class SearchPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    await Patcher.waitForViewRequest<SearchView>(this.plugin, "search", view => {
      // Patch the search view until the searchQuery is set or the plugin is unloaded
      const uninstallers: Array<() => void> = []
      Patcher.patchThisAndPrototype(this.plugin, view, {
        startSearch: (next: any) => function (...args: any): any {
          const result = next.call(this, ...args)

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
      _match: Patcher.OverrideExisting(next => function (data: MatchData): any {
        const isCanvas = data.strings.filepath?.endsWith(".canvas") ?? false

        if (isCanvas && !data.cache)
          data.cache = this.app.metadataCache.getCache(data.strings.filepath)

        return next.call(this, data)
      })
    })
  }
}
