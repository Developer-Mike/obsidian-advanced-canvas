import PropertiesView from "src/@types/PropertiesPlugin"
import Patcher from "./patcher"
import { TFile } from "obsidian"

export default class PropertiesPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    await Patcher.waitForViewRequest<PropertiesView>(this.plugin, "file-properties", view => {
      Patcher.patchPrototype<PropertiesView>(this.plugin, view, {
        isSupportedFile: Patcher.OverrideExisting(next => function (file?: TFile): boolean {
          // Check if the file is a canvas file
          if (file?.extension === 'canvas') return true

          // Otherwise, call the original method
          return next.call(this, file)
        }),
        updateFrontmatter: Patcher.OverrideExisting(next => function (file: TFile, content: string): { [key: string]: any } | null {
          // Check if the file is a canvas file
          if (file?.extension === 'canvas') {
            const frontmatter = JSON.parse(content)?.metadata?.frontmatter ?? {}

            this.rawFrontmatter = JSON.stringify(frontmatter, null, 2)
            this.frontmatter = frontmatter

            return frontmatter
          }

          // Otherwise, call the original method
          return next.call(this, file, content)
        }),
        saveFrontmatter: Patcher.OverrideExisting(next => function (frontmatter: { [key: string]: any }): void {
          // Check if the file is a canvas file
          if (this.file?.extension === 'canvas') {
            if (this.file !== this.modifyingFile) return

            this.app.vault.process(this.file, (data: string) => {
              const content = JSON.parse(data)
              if (content?.metadata) content.metadata.frontmatter = frontmatter

              return JSON.stringify(content, null, 2)
            })

            return
          }

          // Otherwise, call the original method
          return next.call(this, frontmatter)
        })
      })
    })
  }
}