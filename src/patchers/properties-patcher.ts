import Properties from "src/@types/PropertiesPlugin"
import Patcher from "./patcher"
import { TFile } from "obsidian"

export default class PropertiesPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    await Patcher.patchViewOnRequest<Properties>(this.plugin, "file-properties", view => {
      Patcher.patchPrototype<Properties>(this.plugin, view, {
        isSupportedFile: Patcher.OverrideExisting(next => function (file?: TFile): boolean {
          // Check if the file is a canvas file
          if (file?.extension === 'canvas') return true

          // Otherwise, call the original method
          return next.call(this, file)
        }),
        saveFrontmatter: Patcher.OverrideExisting(next => function (frontmatter: { [key: string]: any }): void {
          // Check if the file is a canvas file
          if (this.file?.extension === 'canvas') {
            // TODO
            console.log('Saving canvas frontmatter', this.file, frontmatter)
          }

          // Otherwise, call the original method
          return next.call(this, frontmatter)
        })
      })
    })
  }
}