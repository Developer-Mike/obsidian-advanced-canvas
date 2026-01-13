import { TFile } from "obsidian"
import PropertiesView from "src/@types/PropertiesPlugin"
import Patcher from "./patcher"

export default class PropertiesPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return
    if (!this.plugin.app.viewRegistry.viewByType["file-properties"])
      return console.warn("PropertiesPatcher: Core plugin 'file-properties' not enabled.")

    const that = this
    await Patcher.waitForViewRequest<PropertiesView>(this.plugin, "file-properties", view => {
      Patcher.patchPrototype<PropertiesView>(this.plugin, view, {
        onLoadFile: Patcher.OverrideExisting(next => function (file?: TFile, ...args: any[]): void {
          // Use metadata file instead of canvas file directly (if available)
          if (file?.extension === 'canvas') {
            const metadataFile = that.plugin.metadataManager.getMetadataFile(
              this.file, undefined,
              () => (this.onLoadFile as any)(file, ...args)
            )

            if (metadataFile) {
              this.file = metadataFile
              this.relayCanvasFile = file
              return next.call(this, metadataFile, ...args)
            }
          } else delete this.relayCanvasFile

          return next.call(this, file, ...args)
        }),
        saveFrontmatter: Patcher.OverrideExisting(next => function (frontmatter: { [key: string]: any }, ...args: any[]): void {
          // If relaying from metadata file to canvas file, update canvas file frontmatter
          if (this.relayCanvasFile) {
            console.log(frontmatter)
          }

          return next.call(this, frontmatter, ...args)
        })
      })
    })
  }
}
