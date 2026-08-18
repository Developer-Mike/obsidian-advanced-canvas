import { TAbstractFile, TFile, TFolder, Vault } from "obsidian"
import Patcher, { invoke } from "./patcher"
import Backlink from "src/@types/BacklinkPlugin"

export default class BacklinksPatcher extends Patcher {
  private isRecomputingBacklinks = false

  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher
    await Patcher.waitForViewRequest<{ backlink: Backlink }>(this.plugin, "backlink", view => {
      Patcher.patchPrototype<Backlink>(this.plugin, view.backlink, {
        recomputeBacklink: Patcher.OverrideExisting(next => function (file: TFile): void {
          that.isRecomputingBacklinks = true
          const result = invoke(next, this, file)
          that.isRecomputingBacklinks = false
          return result
        })
      })
    })

    Patcher.patchPrototype<Vault>(this.plugin, this.plugin.app.vault, {
      recurseChildrenAC: _next => function (origin: TAbstractFile, traverse: (file: TAbstractFile) => void) {
        for (let stack = [origin]; stack.length > 0;) {
          const current = stack.pop()
          if (current) {
            traverse(current)

            // If the current item is a folder, add its children to the stack
            if (current instanceof TFolder) stack = stack.concat(current.children)
          }
        }
      },
      getMarkdownFiles: Patcher.OverrideExisting(next => function (): TFile[] {
        if (!that.isRecomputingBacklinks) return invoke(next, this)

        // If we are recomputing backlinks, we need to include markdown as well as canvas files
        const files: TFile[] = []
        const root = this.getRoot()

        this.recurseChildrenAC(root, (child: TAbstractFile) => {
          if (child instanceof TFile && (child.extension === "md" || child.extension === "canvas")) {
            files.push(child)
          }
        })

        return files
      })
    })
  }
}
