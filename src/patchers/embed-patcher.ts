import { EmbedContext, TFile } from "obsidian"
import AdvancedCanvasEmbed from "src/advanced-canvas-embed"
import Patcher, { invoke } from "./patcher"

export default class EmbedPatcher extends Patcher {
  async patch() {
    if (!this.plugin.settings.getSetting('enableSingleNodeLinks')) return

    const embedByExtension = this.plugin.app.embedRegistry.embedByExtension
    const originalCanvasEmbed = embedByExtension['canvas']
    if (!originalCanvasEmbed) return

    embedByExtension['canvas'] = function (context: EmbedContext, file: TFile, subpath?: string) {
      if (subpath) return new AdvancedCanvasEmbed(context, file, subpath)
      return invoke(originalCanvasEmbed, this, context, file, subpath)
    }

    this.plugin.register(() => { embedByExtension['canvas'] = originalCanvasEmbed })
  }
}
