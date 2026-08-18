import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

export default class ReadingModeFixCanvasExtension extends CanvasExtension {
  isEnabled() { return 'readingModeFixEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-rendered',
      (_canvas: Canvas, node: CanvasNode) => this.updateNodeRenderer(node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (_canvas: Canvas, node: CanvasNode, isEditing: boolean) => {
        if (isEditing) return
        this.updateNodeRenderer(node)
      }
    ))
  }

  private updateNodeRenderer(node: CanvasNode) {
    const renderer = (node.child as unknown as { previewMode?: { renderer?: { text?: string; onRendered: (cb: () => void) => void; set: (text: string) => void } } })?.previewMode?.renderer
    if (!renderer) return

    renderer.onRendered(() => {
      let text = renderer.text ?? ""
      text = text.replaceAll('<span class="vertical-space">&nbsp;</span>\n', '\n')
      text = text.replaceAll('\n', '<span class="vertical-space">&nbsp;</span>\n')

      renderer.set(text)
    })
  }
}
