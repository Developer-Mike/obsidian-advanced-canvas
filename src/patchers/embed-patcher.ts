import { Component, EmbedContext, TFile } from "obsidian"
import AdvancedCanvasEmbed from "src/advanced-canvas-embed"
import Patcher from "./patcher"

export default class EmbedPatcher extends Patcher {
  async patch() {
    if (!this.plugin.settings.getSetting('enableSingleNodeLinks')) return

    Patcher.patch(this.plugin, this.plugin.app.embedRegistry.embedByExtension, {
      canvas: next => function (context: EmbedContext, file: TFile, subpath?: string): Component {
        // If there is a subpath, return custom embed
        if (subpath) return new AdvancedCanvasEmbed(context, file, subpath)

        return next.call(this, context, file, subpath)
      },
    })
  }
}
