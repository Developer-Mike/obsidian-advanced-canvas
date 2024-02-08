import AdvancedCanvasPlugin from "src/main"
import { BBox, CanvasNode, SelectionData } from "src/@types/Canvas"
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
      setNodeData: (_next: any) => function (node: CanvasNode, key: string, value: any) {
        node.setData({ 
          ...node.getData(),
          [key]: value 
        })
        this.requestSave()

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])
      },
      markViewportChanged: (next: any) => function (...args: any) {
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.After, this)
        return result
      },
      zoomToBbox: (next: any) => function (bbox: BBox) {
        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.Before, this, bbox)
        const result = next.call(this, bbox)
        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.After, this, bbox)
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
      handlePaste: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()])
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
      render: (next: any) => function (visible: boolean) {
        const result = next.call(this, visible)

        if (visible) {
          that.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, this.canvas)

          // Re-Center the popup menu
          next.call(this, false)
        }
        
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

    // Listen to canvas changes
    const onCanvasChangeListener = this.plugin.app.workspace.on('active-leaf-change', () => {
      const canvas = this.plugin.getCurrentCanvas()
      if (!canvas) return

      this.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, canvas)
      this.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.After, canvas)
      this.triggerWorkspaceEvent(CanvasEvent.ReadonlyChanged, canvas, canvas.readonly)
      this.triggerWorkspaceEvent(CanvasEvent.NodesChanged, canvas, [...canvas.nodes.values()])
    })
    this.plugin.registerEvent(onCanvasChangeListener)

    // Trigger instantly (Plugin reload)
    onCanvasChangeListener.fn.call(this.plugin.app.workspace)
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}