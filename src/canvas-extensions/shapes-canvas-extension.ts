import { Canvas, CanvasNode } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/events/events"

interface Shape {
  id: string|null
  menuName: string
  icon: string
}

const SHAPES: Shape[] = [
  {
    id: null,
    menuName: 'Default',
    icon: 'circle-off'
  },
  {
    id: 'oval',
    menuName: 'Oval',
    icon: 'oval'
  },
  {
    id: 'centered-rectangle',
    menuName: 'Rectangle',
    icon: 'rectangle-horizontal'
  },
  {
    id: 'diamond',
    menuName: 'Diamond',
    icon: 'diamond'
  },
  {
    id: 'parallelogram',
    menuName: 'Parallelogram',
    icon: 'parallelogram'
  },
  {
    id: 'circle',
    menuName: 'Circle',
    icon: 'circle'
  },
  {
    id: 'predefined-process',
    menuName: 'Predefined process',
    icon: 'predefined-process'
  },
  {
    id: 'document',
    menuName: 'Document',
    icon: 'document'
  },
  {
    id: 'database',
    menuName: 'Database',
    icon: 'database-shape'
  }
]

export default class ShapesCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('shapesFeatureEnabled')) return

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  onPopupMenuCreated(canvas: Canvas): void {
    // If the canvas is readonly or there is no valid shape in the selection, return
    if (canvas.readonly || !this.hasValidShapeInSelection(canvas.selection))
      return

    let menuOption = CanvasHelper.createPopupMenuOption(
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
      const shapeButton = CanvasHelper.createPopupMenuOption(
        '',
        shape.menuName,
        shape.icon,
        () => this.setShapeForSelection(canvas, shape)
      )

      shapesMenu.appendChild(shapeButton)
    }

    // Add menu option to menu bar
    CanvasHelper.addPopupMenuOption(canvas, menuOption)
  }

  private hasValidShapeInSelection(selection: Set<CanvasNode>): boolean {
    if (!selection) return false

    for (const node of selection) {
      if (node.getData().type === 'text') return true
    }
    
    return false
  }

  private setShapeForSelection(canvas: Canvas, shape: Shape) {  
    for (const node of canvas.selection) {
      if (node.getData().type !== 'text') continue

      canvas.setNodeData(node, 'shape', shape.id)
    }
  }
}