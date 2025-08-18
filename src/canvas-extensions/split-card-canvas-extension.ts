import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'
import { Menu } from 'obsidian'
import { CanvasTextNodeData, CanvasEdgeData } from 'src/@types/AdvancedJsonCanvas'

const SPLIT_CARD_EDGE_ID_PREFIX = "spl"

export default class SplitCardCanvasExtension extends CanvasExtension {
  isEnabled() { return true }
  
  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:node-menu',
      (menu: Menu, node: CanvasNode) => this.onNodeMenu(menu, node)
    ))
  }

  private onNodeMenu(menu: Menu, node: CanvasNode) {
    const nodeData = node.getData()
    
    // Only show menu item for text nodes
    if (nodeData.type !== 'text') return

    menu.addItem((item) => {
      item.setTitle('Split Card by new line')
        .setIcon('split-horizontal')
        .onClick(() => this.splitCardByNewline(node))
    })
  }

  private async splitCardByNewline(node: CanvasNode) {
    const canvas = node.canvas
    const nodeData = node.getData() as CanvasTextNodeData
    
    // Ensure this is a text node
    if (nodeData.type !== 'text') return
    
    // Split text by newlines and filter out empty/whitespace-only lines
    const lines = nodeData.text.split('\n').filter((line: string) => !line.match(/^\s*$/))
    
    // Need at least 2 lines to split
    if (lines.length < 2) return
    
    // Get all edges connected to this node
    const connectedEdges = canvas.getEdgesForNode(node)
    
    // Create new nodes for each line
    const newNodes: CanvasNode[] = []
    const nodeMargin = this.plugin.settings.getSetting('cloneNodeMargin')
    const defaultSize = canvas.config.defaultTextNodeDimensions
    
    for (let i = 0; i < lines.length; i++) {
      const newNode = canvas.createTextNode({
        pos: {
          x: node.x + (node.width - defaultSize.width) / 2,
          y: node.y + (i * (defaultSize.height + nodeMargin))
        },
        size: defaultSize
      })
      
      // Set the text content for this line
      newNode.setData({
        ...newNode.getData(),
        text: lines[i],
        color: nodeData.color,
        styleAttributes: nodeData.styleAttributes,
        ratio: nodeData.ratio,
        zIndex: nodeData.zIndex
      })
      
      newNodes.push(newNode)
    }
    
    // Recreate edges for each new node using canvas.importData
    const newEdges: CanvasEdgeData[] = []
    
    for (const edge of connectedEdges) {
      const edgeData = edge.getData()
      
      for (const newNode of newNodes) {
        // Determine source and target nodes
        const fromNode = edge.from.node === node ? newNode.id : edge.from.node.id
        const toNode = edge.to.node === node ? newNode.id : edge.to.node.id
        
        // Create new edge connecting to each split node
        newEdges.push({
          id: `${SPLIT_CARD_EDGE_ID_PREFIX}${edgeData.id}${newNode.id}`,
          fromNode,
          fromSide: edge.from.side,
          toNode,
          toSide: edge.to.side,
          label: edgeData.label || '',
          color: edgeData.color,
          styleAttributes: edgeData.styleAttributes
        })
      }
    }
    
    // Add new edges
    if (newEdges.length > 0)
      canvas.importData({ nodes: [], edges: newEdges }, false, false)
    
    // Remove original edges
    for (const edge of connectedEdges)
      canvas.removeEdge(edge)
    
    // Remove original node
    canvas.removeNode(node)
        
    // Select all new nodes for user feedback
    canvas.updateSelection(() => {
      canvas.selection = new Set(newNodes)
    })
  }
}