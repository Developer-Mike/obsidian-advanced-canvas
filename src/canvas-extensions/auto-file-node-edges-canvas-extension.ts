import { TFile } from "obsidian"
import CanvasExtension from "./canvas-extension"
import { Canvas, CanvasNode } from "src/@types/Canvas"

export default class AutoFileNodeEdgesCanvasExtension extends CanvasExtension {
  isEnabled() { return 'autoFileNodeEdgesFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.metadataCache.on(
      'changed',
      (file: TFile) => this.onMetadataChanged(file)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas, node: CanvasNode) => this.onNodeChanged(canvas, node)
    ))
  }

  private onMetadataChanged(file: TFile) {

  }

  private onNodeChanged(canvas: Canvas, node: CanvasNode) {
    console.log('Node changed:', node)
  }
}