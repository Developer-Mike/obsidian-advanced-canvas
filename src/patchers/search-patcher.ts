import Patcher from "./patcher"
import Search, { MatchData } from "src/@types/SearchPlugin"

export default class SearchPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    await Patcher.patchViewOnRequest<Search>(this.plugin, "search", view => {
      Patcher.patchPrototype<Search>(this.plugin, view, {
        startSearch: Patcher.OverrideExisting(next => function (): void {
          const result = next.apply(this)
          if (this.searchQuery.isPatched) {
            console.warn("SearchPatcher: already patched")
            return result
          }
          
          this.searchQuery.isPatched = true
          Patcher.patch(that.plugin, this.searchQuery, {
            _match: Patcher.OverrideExisting(next => function (data: MatchData): any {
              const isCanvas = data.strings.filepath.endsWith(".canvas")

              if (isCanvas && !data.cache)
                data.cache = this.app.metadataCache.getCache(data.strings.filepath)

              return next.call(this, data)
            })
          })

          return result
        })
      })
    })
  }
}