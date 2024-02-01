import { addIcon } from "obsidian"
import CanvasExtension from "./canvas-extension"
import { CanvasNode } from "src/types/Canvas"

interface Shape {
  id: string|null
  className: string|null
  menuName: string
  icon: () => string
}

const SHAPES: Shape[] = [
  {
    id: null,
    className: null,
    menuName: 'Default',
    icon: () => 'circle-off'
  },
  {
    id: 'oval',
    className: 'oval-shape',
    menuName: 'Oval',
    icon: () => {
      addIcon('oval', `
        <rect rx="31.25" height="62.5" width="93.75" y="18.75" x="3.125" stroke-width="8.333" stroke="currentColor" fill="transparent"/>
      `)
      return 'oval'
    }
  },
  {
    id: 'centered-rectangle',
    className: 'rectangle-shape',
    menuName: 'Rectangle',
    icon: () => 'rectangle-horizontal'
  },
  {
    id: 'diamond',
    className: 'diamond-shape',
    menuName: 'Diamond',
    icon: () => 'diamond'
  },
  {
    id: 'parallelogram',
    className: 'parallelogram-shape',
    menuName: 'Parallelogram',
    icon: () => {
      addIcon('parallelogram', `
        <rect transform="skewX(-20)" rx="5" height="50" width="70" y="25" x="35" stroke-width="8.333" stroke="currentColor" fill="transparent"/>
      `)
      return 'parallelogram'
    }
  },
  {
    id: 'circle',
    className: 'circle-shape',
    menuName: 'Circle',
    icon: () => 'circle'
  },
  {
    id: 'predefined-process',
    className: 'predefined-process-shape',
    menuName: 'Predefined process',
    icon: () => {
      addIcon('predefined-process', `
        <g stroke-width="2" stroke="currentColor" fill="none" transform="matrix(4.166667,0,0,4.166667,0,0)">
          <path d="M 4.999687 3 L 19.000312 3 C 20.104688 3 21 3.895312 21 4.999687 L 21 19.000312 C 21 20.104688 20.104688 21 19.000312 21 L 4.999687 21 C 3.895312 21 3 20.104688 3 19.000312 L 3 4.999687 C 3 3.895312 3.895312 3 4.999687 3 Z M 4.999687 3 "/>
          <path d="M 7 3 L 7 21 "/>
          <path d="M 17 3 L 17 21 "/>
        </g>
      `)
      return 'predefined-process'
    }
  },
  {
    id: 'document',
    className: 'document-shape',
    menuName: 'Document',
    icon: () => {
      addIcon('document', `
        <path transform="translate(0, 5)" stroke="currentColor" fill="none" stroke-width="8.333" d="M83.75 25C85.82 25 87.5 26.68 87.5 28.75L87.5 64.375Q68.75 54.25 50 64.375 31.25 74.5 12.5 64.375L12.5 30.625 12.5 28.75C12.5 26.68 14.18 25 16.25 25Z"/>
      `)
      return 'document'
    }
  },
  {
    id: 'database',
    className: 'database-shape',
    menuName: 'Database',
    icon: () => {
      addIcon('database-shape', `
        <g transform="translate(20, 20)" stroke-width="8.333" stroke="currentColor" fill="none">
          <path d="M 1 51 L 1 11 C 1 5.48 14.43 1 31 1 C 47.57 1 61 5.48 61 11 L 61 51 C 61 56.52 47.57 61 31 61 C 14.43 61 1 56.52 1 51 Z"/>
          <path d="M 1 11 C 1 16.52 14.43 21 31 21 C 47.57 21 61 16.52 61 11"/>
        </g>
      `)
      return 'database-shape'
    }
  }
]

export default class ShapesCanvasExtension extends CanvasExtension {
  onCardMenuCreated(): void {}
  onPopupMenuCreated(): void {
    let menuOption = this.createPopupMenuOption(
      'node-shape-option',
      'Node shape',
      'shapes', 
      () => menuOption.classList.toggle('expanded')
    )

    // Add popup menu
    const shapesMenu = document.createElement('div')
    shapesMenu.classList.add('shapes-menu')
    menuOption.appendChild(shapesMenu)

    // Add custom nodes
    for (const shape of SHAPES) {
      const shapeButton = this.createPopupMenuOption(
        '',
        shape.menuName,
        shape.icon(),
        () => this.setShapeForSelection(this.canvas.selection, shape)
      )

      shapesMenu.appendChild(shapeButton)
    }

    // Add menu option to menu bar
    this.addPopupMenuOption(menuOption)
  }

  onNodeChanged(node: CanvasNode): void {
    const nodeShape = node.unknownData.shape
    const nodeType = SHAPES.find(n => n.id === nodeShape)

    // Remove all previous shapes
    for (const shape of SHAPES) {
      if (!shape.className) continue
      node.nodeEl.classList.remove(shape.className)
    }

    // Add new shape
    if (!nodeType?.className) return
    node.nodeEl.classList.add(nodeType.className)
  }

  private setShapeForSelection(selection: Set<CanvasNode>, shape: Shape) {  
    for (const node of selection) {
      if (node.unknownData.type !== 'text') continue
      this.setNodeUnknownData(node, 'shape', shape.id)
    }
  }
}