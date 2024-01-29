import { addIcon } from "obsidian"
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
    menuName: 'Oval shaped card',
    icon: () => {
      addIcon('oval', '<rect rx="31.25" height="62.5" width="93.75" y="18.75" x="3.125" stroke-width="5.5" stroke="currentColor" fill="transparent"/>')
      return 'oval'
    }
  },
  {
    alias: ['process', 'rectangle', 'rect', 'center'],
    className: 'rectangle-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Rectangle shaped card',
    icon: () => 'rectangle-horizontal'
  },
  {
    alias: ['if', 'diamond'],
    className: 'diamond-node',
    defaultSize: { width: 150, height: 100 },
    menuName: 'Diamond shaped card',
    icon: () => 'diamond'
  },
  {
    alias: ['in-out', 'in', 'input', 'out', 'output', 'parallelogram'],
    className: 'parallelogram-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Parallelogram shaped card',
    icon: () => {
      addIcon('parallelogram', '<rect transform="skewX(-20)" rx="5" height="50" width="70" y="25" x="35" stroke-width="5.5" stroke="currentColor" fill="transparent"/>')
      return 'parallelogram'
    }
  },
  {
    alias: ['reference', 'ref', 'circle'],
    className: 'circle-node',
    defaultSize: { width: 50, height: 50 },
    menuName: 'Circle shaped card',
    icon: () => 'circle'
  },
  {
    alias: ['predefined', 'predefined-process'],
    className: 'predefined-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Predefined process shaped card',
    icon: () => {
      addIcon('predefined-process', `
        <g stroke-width="1.25" stroke="currentColor" transform="matrix(4.166667,0,0,4.166667,0,0)">
          <path d="M 4.999687 3 L 19.000312 3 C 20.104688 3 21 3.895312 21 4.999687 L 21 19.000312 C 21 20.104688 20.104688 21 19.000312 21 L 4.999687 21 C 3.895312 21 3 20.104688 3 19.000312 L 3 4.999687 C 3 3.895312 3.895312 3 4.999687 3 Z M 4.999687 3 "/>
          <path d="M 7 3 L 7 21 "/>
          <path d="M 17 3 L 17 21 "/>
        </g>
      `)
      return 'predefined-process'
    }
  },
  {
    alias: ['document', 'doc', 'file'],
    className: 'document-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Document shaped card',
    icon: () => {
      addIcon('document', `
        <path transform="translate(0, 5)" stroke="currentColor" stroke-width="5" d="M83.75 25C85.82 25 87.5 26.68 87.5 28.75L87.5 64.375Q68.75 54.25 50 64.375 31.25 74.5 12.5 64.375L12.5 30.625 12.5 28.75C12.5 26.68 14.18 25 16.25 25Z"/>
      `)
      return 'document'
    }
  },
  {
    alias: ['database', 'data'],
    className: 'database-node',
    defaultSize: { width: 150, height: 60 },
    menuName: 'Database shaped card',
    icon: () => {
      addIcon('database-node', `
        <g transform="translate(20, 20)" stroke-width="5" stroke="currentColor">
          <path d="M 1 51 L 1 11 C 1 5.48 14.43 1 31 1 C 47.57 1 61 5.48 61 11 L 61 51 C 61 56.52 47.57 61 31 61 C 14.43 61 1 56.52 1 51 Z"/>
          <path d="M 1 11 C 1 16.52 14.43 21 31 21 C 47.57 21 61 16.52 61 11"/>
        </g>
      `)
      return 'database-node'
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
    if (!nodeData.text.match(/%%.*%%/)) return

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