import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'

export default class NodeRatioCanvasExtension extends CanvasExtension {
  isEnabled() { return true }
  
  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas, node: CanvasNode) => this.onNodeResized(canvas, node)
    ))
  }

  private onNodeResized(_canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (!nodeData.ratio) return

    const nodeBBox = node.getBBox()
    const nodeSize = {
      width: nodeBBox.maxX - nodeBBox.minX,
      height: nodeBBox.maxY - nodeBBox.minY
    }
    const nodeAspectRatio = nodeSize.width / nodeSize.height

    if (nodeAspectRatio < nodeData.ratio)
      nodeSize.width = nodeSize.height * nodeData.ratio
    else nodeSize.height = nodeSize.width / nodeData.ratio

    node.setData({
      ...nodeData,
      width: nodeSize.width,
      height: nodeSize.height
    })
  }
}