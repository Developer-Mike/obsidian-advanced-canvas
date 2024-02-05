import AdvancedCanvasPlugin from "src/main"
import { Canvas, CanvasNode } from "src/types/Canvas"
import { patchWorkspaceFunction } from "src/utils/patch-helper"
import { CanvasEvent } from "./events"

export default class CanvasEventEmitter {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    const that = this
    
    // Listen for canvas change
    const leafChangeEvent = this.plugin.app.workspace.on('active-leaf-change', () => {
      const canvas = this.plugin.getCurrentCanvas()

      if (canvas) {
        this.patchCanvas(canvas)
        this.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, canvas)
        this.triggerWorkspaceEvent(CanvasEvent.NodesChanged, canvas, [...canvas.nodes.values()])
      }
    })
    this.plugin.registerEvent(leafChangeEvent)

    // Patch canvas undo/redo and the handlePaste function
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvas(), {
      undo: (next: any) => this.redirectAndUpdateAllNodes(next),
      redo: (next: any) => this.redirectAndUpdateAllNodes(next),
      addNode: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])

        return result
      }
    })

    // Patch popup menu
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvas()?.menu, {
      render: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        const canvas = that.plugin.getCurrentCanvas()
        if (canvas) that.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, canvas)

        // Re-Center the popup menu
        next.call(this)
        
        return result
      }
    })

    // Patch interaction layer
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvas()?.nodeInteractionLayer, {
      setTarget: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)

        const canvas = that.plugin.getCurrentCanvas()
        if (canvas) that.triggerWorkspaceEvent(CanvasEvent.NodeInteraction, canvas, node)

        return result
      }
    })

    // Trigger canvas changed event when canvas is already loaded
    this.triggerWorkspaceEvent('active-leaf-change')
  }

  private patchCanvas(canvas: Canvas) {
    const that = this

    canvas.setNodeUnknownData = function (node: CanvasNode, key: string, value: any) {
      node.unknownData[key] = value
      this.requestSave()

      that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])
    }
  }

  private redirectAndUpdateAllNodes(next: any): (...args: any) => any {
    const that = this

    return function (...args: any) {
      const result = next.call(this, ...args)

      const canvas = that.plugin.getCurrentCanvas()
      if (canvas) that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, canvas, canvas.nodes)

      return result
    }
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}