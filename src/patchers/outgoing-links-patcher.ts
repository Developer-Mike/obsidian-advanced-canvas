import OutgoingLink from "src/@types/OutgoingLinkPlugin"
import MetadataManager from "src/managers/metadata-manager"
import Patcher from "./patcher"

export default class OutgoingLinksPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const that = this
    await Patcher.waitForViewRequest<any>(this.plugin, "outgoing-link", view => {
      Patcher.patchPrototype<OutgoingLink>(this.plugin, view.outgoingLink, {
        recomputeLinks: Patcher.OverrideExisting(next => function (...args: any[]): void {
          // Use metadata file instead of canvas file directly (if available)
          if (this.file?.extension === 'canvas') {
            const metadataFile = that.plugin.metadataManager.getMetadataFile(
              this.file,
              undefined,
              () => (this.recomputeLinks as any)(...args)
            )

            if (metadataFile) this.file = metadataFile
          }

          return next.call(this, ...args)
        })
      })
    })
  }
}
