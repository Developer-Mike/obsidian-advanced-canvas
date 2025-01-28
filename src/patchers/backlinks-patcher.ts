import PatchHelper from "src/utils/patch-helper"
import Patcher from "./patcher"
import { TAbstractFile, TFile, TFolder } from "obsidian"

export default class BacklinksPatcher extends Patcher {
  private isRecomputingBacklinks: boolean = false

  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    const backlinkPatch = PatchHelper.tryPatchWorkspacePrototype(this.plugin, () => (
      (this.plugin.app.workspace.getLeavesOfType('backlink').first()?.view as any)?.backlink
    ), {
      recomputeBacklink: (next: any) => function (file: TFile, ...args: any[]) {
        that.isRecomputingBacklinks = true
        const result = next.call(this, file, ...args)
        that.isRecomputingBacklinks = false
        return result
      }
    })

    const vaultPatch = PatchHelper.patchObjectPrototype(this.plugin, this.plugin.app.vault, {
      recurseChildrenAC: (_next: any) => function (origin: TAbstractFile, traverse: (file: TAbstractFile) => void) {
        for (var stack = [origin]; stack.length > 0;) {
          var current = stack.pop()
          if (current) {
            traverse(current)

            // If the current item is a folder, add its children to the stack
            if (current instanceof TFolder) stack = stack.concat(current.children)
          }
        }
      },
      getMarkdownFiles: (next: any) => function (file: TFile, ...args: any[]) {
        if (!that.isRecomputingBacklinks) return next.call(this, file, ...args)

        // If we are recomputing backlinks, we need to include markdown as well as canvas files
        var files: TFile[] = []
        var root = this.getRoot()

        this.recurseChildrenAC(root, (child: TAbstractFile) => {
          if (child instanceof TFile && (child.extension === "md" || child.extension === "canvas")) {
            files.push(child)
          }
        })

        return files
      }
    })

    const [backlink] = await Promise.all([backlinkPatch, vaultPatch])

    // Patch successful - recompute backlinks
    backlink.recomputeBacklink(this.plugin.app.workspace.getActiveFile())
  }
}