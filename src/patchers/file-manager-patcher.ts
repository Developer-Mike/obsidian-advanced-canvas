import { DataWriteOptions, TFile } from "obsidian"
import Patcher from "./patcher"

export default class FileManagerPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    Patcher.patch(this.plugin, this.plugin.app.fileManager, {
      processFrontMatter: Patcher.OverrideExisting(next => async function (file: TFile, fn: (frontmatter: any) => void, options?: DataWriteOptions) {
        // Check if the file is a canvas file
        if (file?.extension === 'canvas') {
          that.plugin.app.vault.process(file, (data: string) => {
            const content = JSON.parse(data)

            // Modify frontmatter
            fn(content.metadata.frontmatter)

            // Save changes
            return JSON.stringify(content, null, 2)
          })

          return
        }

        // Otherwise, call the original method
        return next.call(this, file, fn, options)
      }),
    })
  }
}
