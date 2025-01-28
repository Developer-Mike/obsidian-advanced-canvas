import PatchHelper from "src/utils/patch-helper"
import Patcher from "./patcher"

export default class OutgoingLinksPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasLinksFeatureEnabled')) return

    const that = this
    PatchHelper.tryPatchWorkspacePrototype(this.plugin, () => {

    }, {
      foo: (next: any) => function (...args: any[]) {
        return next.call(this, ...args)
      }
    })
  }
}