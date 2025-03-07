import PatchHelper from "src/utils/patch-helper"
import Patcher from "./patcher"
import OutgoingLink from "src/@types/OutgoingLink"

export default class OutgoingLinksPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    const outgoingLinkPatch = PatchHelper.tryPatchWorkspacePrototype<OutgoingLink>(this.plugin, () => (
      (this.plugin.app.workspace.getLeavesOfType('outgoing-link').first()?.view as any)?.outgoingLink
    ), {
      recomputeLinks: PatchHelper.OverrideExisting(next => function (...args: any[]): void {
        const isCanvas = this.file?.extension === 'canvas'

        // Trick the app into thinking that the file is a markdown file
        if (isCanvas) this.file.extension = 'md'

        const result = next.call(this, ...args)

        // Revert the extension change
        if (isCanvas) this.file.extension = 'canvas'

        return result
      }),
      recomputeUnlinked: PatchHelper.OverrideExisting(next => function (...args: any[]): void {
        const isCanvas = this.file?.extension === 'canvas'

        // Trick the app into thinking that the file is a markdown file
        if (isCanvas) this.file.extension = 'md'

        const result = next.call(this, ...args)

        // Revert the extension change
        if (isCanvas) this.file.extension = 'canvas'

        return result
      })
    })

    const [outgoingLink] = await Promise.all([outgoingLinkPatch])

    // Patch successful - recompute outgoing links
    outgoingLink.recomputeLinks()
    outgoingLink.recomputeUnlinked()
  }
}