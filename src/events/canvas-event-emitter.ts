import AdvancedCanvasPlugin from "src/main"
import { CanvasNode } from "src/types/Canvas"
import { patchWorkspaceFunction } from "src/utils/patch-helper"
import { CanvasEvent } from "./events"

export default class CanvasEventEmitter {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    const that = this

    // Patch canvas
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvas(), {
      // Add custom function
      setNodeUnknownData: (_next: any) => function (node: CanvasNode, key: string, value: any) {
        node.unknownData[key] = value
        this.requestSave()
  
        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])
      },
      // Listen to canvas change
      importData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, this)
        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()])

        return result
      },
      undo: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()])

        return result
      },
      redo: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()])

        return result
      },
      addNode: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])

        return result
      }
    })

    // Patch canvas popup menu
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvas()?.menu, {
      render: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        that.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, this.canvas)

        // Re-Center the popup menu
        next.call(this)
        
        return result
      }
    })

    // Patch interaction layer
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvas()?.nodeInteractionLayer, {
      setTarget: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)

        that.triggerWorkspaceEvent(CanvasEvent.NodeInteraction, this.canvas, node)

        return result
      }
    })

    // Update current canvas
    this.plugin.app.workspace.onLayoutReady(() => {
      const canvas = this.plugin.getCurrentCanvas()
      if (!canvas) return

      this.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, canvas)
      this.triggerWorkspaceEvent(CanvasEvent.NodesChanged, canvas, [...canvas.nodes.values()])
    })
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}