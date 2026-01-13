import PropertiesView from "src/@types/PropertiesPlugin"
import Patcher from "./patcher"
import { TFile } from "obsidian"
import MetadataManager from "src/managers/metadata-manager"

export default class PropertiesPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return
    if (!this.plugin.app.viewRegistry.viewByType["file-properties"])
      return console.warn("PropertiesPatcher: Core plugin 'file-properties' not enabled.")

    await Patcher.waitForViewRequest<PropertiesView>(this.plugin, "file-properties", view => {
      Patcher.patchPrototype<PropertiesView>(this.plugin, view, {
        onLoadFile: Patcher.OverrideExisting(next => function (file?: TFile, ...args: any[]): void {
          // Use metadata file instead of canvas file directly (if available)
          if (file?.extension === 'canvas') {
            const metadataFile = MetadataManager.getMetadataFile(this.file)

            if (metadataFile) {
              this.file = metadataFile
              return next.call(this, metadataFile, ...args)
            }
          }

          return next.call(this, file, ...args)
        })
      })
    })
  }
}
