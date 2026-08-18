import Patcher, { invoke } from "./patcher"
import OutgoingLink from "src/@types/OutgoingLinkPlugin"

export default class OutgoingLinksPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    await Patcher.waitForViewRequest<{ outgoingLink: OutgoingLink }>(this.plugin, "outgoing-link", view => {
      Patcher.patchPrototype<OutgoingLink>(this.plugin, view.outgoingLink, {
        recomputeLinks: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
          const isCanvas = this.file?.extension === 'canvas'

          if (isCanvas) this.file.extension = 'md'

          const result = invoke(next, this, ...args)

          if (isCanvas) this.file.extension = 'canvas'

          return result
        }),
        recomputeUnlinked: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
          const isCanvas = this.file?.extension === 'canvas'

          if (isCanvas) this.file.extension = 'md'

          const result = invoke(next, this, ...args)

          // Revert the extension change
          if (isCanvas) this.file.extension = 'canvas'

          return result
        })
      })
    })
  }
}
