import { Canvas } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as CanvasHelper from "src/utils/canvas-helper"
import { CanvasEvent } from "src/events/events"

interface Shape {
  id?: string
  menuName: string
  icon: string
}

const SHAPES: Shape[] = [
  {
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
    if (canvas.readonly || !this.hasValidNodeInSelection(canvas))
      return

    const nestedMenuOptions = SHAPES.map((shape) => ({
      label: shape.menuName,
      icon: shape.icon,
      callback: () => this.setShapeForSelection(canvas, shape)
    }))

    const menuOption = CanvasHelper.createExpandablePopupMenuOption({
      id: 'node-shape-option',
      label: 'Node shape',
      icon: 'shapes'
    }, nestedMenuOptions)

    // Add menu option to menu bar
    CanvasHelper.addPopupMenuOption(canvas, menuOption)
  }

  private hasValidNodeInSelection(canvas: Canvas): boolean {
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      if (nodeData.type === 'text') return true
    }
    
    return false
  }

  private setShapeForSelection(canvas: Canvas, shape: Shape) {  
    const selectedNodesData = canvas.getSelectionData().nodes

    for (const nodeData of selectedNodesData) {
      if (nodeData.type !== 'text') continue

      const node = canvas.nodes.get(nodeData.id)
      if (!node) continue
      
      node.setData({ ...nodeData, shape: shape.id })
    }
  }
}