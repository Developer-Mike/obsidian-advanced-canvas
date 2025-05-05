import { ExtendedVault, TAbstractFile, TFile, TFolder } from "obsidian"
import Patcher from "./patcher"
import Backlink from "src/@types/BacklinkPlugin"

export default class BacklinksPatcher extends Patcher {
  private isRecomputingBacklinks: boolean = false

  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    await Patcher.waitForViewRequest<any>(this.plugin, "backlink", view => {
      Patcher.patchPrototype<Backlink>(this.plugin, view.backlink, {
        recomputeBacklink: Patcher.OverrideExisting(next => function (file: TFile, ...args: any[]): void {
          that.isRecomputingBacklinks = true
          const result = next.call(this, file, ...args)
          that.isRecomputingBacklinks = false
          return result
        })
      })
    })

    Patcher.patchPrototype<ExtendedVault>(this.plugin, this.plugin.app.vault, {
      recurseChildrenAC: _next => function (origin: TAbstractFile, traverse: (file: TAbstractFile) => void) {
        for (var stack = [origin]; stack.length > 0;) {
          var current = stack.pop()
          if (current) {
            traverse(current)

            // If the current item is a folder, add its children to the stack
            if (current instanceof TFolder) stack = stack.concat(current.children)
          }
        }
      },
      getMarkdownFiles: Patcher.OverrideExisting(next => function (...args: any[]): TFile[] {
        if (!that.isRecomputingBacklinks) return next.call(this, ...args)

        // If we are recomputing backlinks, we need to include markdown as well as canvas files
        var files: TFile[] = []
        var root = this.getRoot()

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