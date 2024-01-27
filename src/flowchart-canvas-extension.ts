import { addIcon, setIcon } from "obsidian"
import CanvasExtension from "./canvas-extension"

interface CustomNode {
  alias: string[]
  className: string
  defaultSize: { width: number, height: number }
  menuName: string
  icon: () => string
}

const CUSTOM_NODES: CustomNode[] = [
  {
    alias: ['start-end', 'start', 'end', 'oval'],
    className: 'oval-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Oval Shaped Card',
    icon: () => {
      addIcon('oval', '<rect rx="31.25" height="62.5" width="93.75" y="18.75" x="3.125" stroke-width="5.5" stroke="currentColor" fill="transparent"/>')
      return 'oval'
    }
  },
  {
    alias: ['if', 'diamond'],
    className: 'diamond-node',
    defaultSize: { width: 150, height: 100 },
    menuName: 'Diamond Shaped Card',
    icon: () => 'diamond'
  },
  {
    alias: ['in-out', 'in', 'input', 'out', 'output', 'parallelogram'],
    className: 'parallelogram-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Parallelogram Shaped Card',
    icon: () => {
      addIcon('parallelogram', '<rect transform="skewX(-20)" rx="5" height="50" width="70" y="25" x="35" stroke-width="5.5" stroke="currentColor" fill="transparent"/>')
      return 'parallelogram'
    }
  }
]

export default class FlowchartCanvasExtension extends CanvasExtension {
  renderMenu(): void {
    let menuOption = this.createMenuOption(
      'more-menu-options', 
      'More node types', 
      'shapes', 
      () => menuOption.classList.toggle('expanded')
    )

    // Add popup menu
    const customNodesMenu = document.createElement('div')
    customNodesMenu.classList.add('custom-nodes-menu')
    menuOption.appendChild(customNodesMenu)

    // Add custom nodes
    for (const node of CUSTOM_NODES) {
      const nodeButton = this.createMenuOption(
        '',
        node.menuName,
        node.icon(),
        () => this.addCustomNode(this.canvas, node)
      )

      customNodesMenu.appendChild(nodeButton)
    }

    // Add menu option to menu bar
    this.addMenuOption(menuOption)
  }

  renderNode(node: any): void {
    const nodeData = node.getData()

    if (nodeData.type !== 'text') return
    if (!nodeData.text.match(/^%%.*%%/)) return

    const alias = nodeData.text.split('%%')[1]
    const customNode = CUSTOM_NODES.find((node: CustomNode) => node.alias.includes(alias))
    if (customNode == null) return

    if (node.nodeEl.classList.contains(customNode.className)) return
    node.nodeEl.classList.add(customNode.className)
  }

  private addCustomNode(canvas: any, node: CustomNode) {    
    canvas.createTextNode({
      pos: this.getCenterCoordinates(node.defaultSize),
      size: node.defaultSize,
      text: `%%${node.alias.first()}%%`,
      save: true,
      focus: true,
    })
  }
}