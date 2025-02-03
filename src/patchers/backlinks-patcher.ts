import { ExtendedVault, TAbstractFile, TFile, TFolder } from "obsidian"
import PatchHelper from "src/utils/patch-helper"
import Patcher from "./patcher"
import Backlink from "src/@types/Backlinks"

export default class BacklinksPatcher extends Patcher {
  private isRecomputingBacklinks: boolean = false

  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    const backlinkPatch = PatchHelper.tryPatchWorkspacePrototype<Backlink>(this.plugin, () => (
      (this.plugin.app.workspace.getLeavesOfType('backlink').first()?.view as any)?.backlink
    ), {
      recomputeBacklink: PatchHelper.OverrideExisting(next => function (file: TFile, ...args: any[]) {
        that.isRecomputingBacklinks = true
        const result = next.call(this, file, ...args)
        that.isRecomputingBacklinks = false
        return result
      })
    })

    const vaultPatch = PatchHelper.patchPrototype<ExtendedVault>(this.plugin, this.plugin.app.vault, {
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
      getMarkdownFiles: PatchHelper.OverrideExisting(next => function (...args: any[]) {
        if (!that.isRecomputingBacklinks) return next.call(this, ...args)

        // If we are recomputing backlinks, we need to include markdown as well as canvas files
        var files: TFile[] = []
        var root = this.getRoot()

        this.recurseChildrenAC(root, (child: TAbstractFile) => {
          if (child instanceof TFile && (child.extension === "md" || child.extension === "canvas")) {
            files.push(child)
          }
        })

        return "files"
      })
    })

    const [backlink] = await Promise.all([backlinkPatch, vaultPatch])

    // Patch successful - recompute backlinks
    backlink.recomputeBacklink(this.plugin.app.workspace.getActiveFile())
  }
}