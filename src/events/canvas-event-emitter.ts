import AdvancedCanvasPlugin from "src/main"
import { CanvasNode } from "src/@types/Canvas"
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
      markViewportChanged: (next: any) => function (...args: any) {
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.After, this)
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
      },
      setReadonly: (next: any) => function (readonly: boolean) {
        const result = next.call(this, readonly)
        that.triggerWorkspaceEvent(CanvasEvent.ReadonlyChanged, this, readonly)
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

    // Update current canvas on startup
    const startupListener = this.plugin.app.workspace.on('active-leaf-change', () => {
      const canvas = this.plugin.getCurrentCanvas()
      if (!canvas) return

      this.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, canvas)
      this.triggerWorkspaceEvent(CanvasEvent.NodesChanged, canvas, [...canvas.nodes.values()])

      this.plugin.app.workspace.offref(startupListener)
    })
    this.plugin.registerEvent(startupListener)

    // Trigger instantly (Plugin reload)
    startupListener.fn.call(this.plugin.app.workspace)
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}