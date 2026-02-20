import BasesView from "src/@types/BasesPlugin"
import Patcher from "./patcher"

export default class BasesPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    await Patcher.waitForViewRequest<BasesView>(this.plugin, "bases", view => {
      Patcher.patchThisAndPrototype<BasesView>(this.plugin, view, {
        onViewChanged: Patcher.OverrideExisting(next => function (): void {
          const result = next.call(this)

          const viewType = this.controller.view?.type
          console.log(viewType)

          return result
        }),
      })
    })
  }
}
