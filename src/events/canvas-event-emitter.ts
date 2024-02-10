import AdvancedCanvasPlugin from "src/main"
import { BBox, Canvas, CanvasData, CanvasNode } from "src/@types/Canvas"
import { patchWorkspaceFunction } from "src/utils/patch-helper"
import { CanvasEvent } from "./events"

export default class CanvasEventEmitter {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    const that = this

    // Patch canvas view
    patchWorkspaceFunction(this.plugin, () => this.plugin.getCurrentCanvasView(), {
      getViewData: (_next: any) => function (..._args: any) {
        return JSON.stringify(this.canvas.getData(), null, 2)
      },
      setViewData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerCanvasChangedEvent(this.canvas)
        return result
      }
    })

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
      markMoved: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeMoved, this, node)
        return result
      },
      removeNode: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeRemoved, this, node)
        return result
      },
      zoomToBbox: (next: any) => function (bbox: BBox) {
        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.Before, this, bbox)
        const result = next.call(this, bbox)
        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.After, this, bbox)
        return result
      },
      setReadonly: (next: any) => function (readonly: boolean) {
        const result = next.call(this, readonly)
        that.triggerWorkspaceEvent(CanvasEvent.ReadonlyChanged, this, readonly)
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
      getData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.DataRequested, this, result)
        return result
      },
      setData: (next: any) => function (data: CanvasData) {
        const setData = (data: CanvasData) => {
          // Maintain history
          this.history.data.pop()

          next.call(this, data)
          that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()])
        }

        that.triggerWorkspaceEvent(CanvasEvent.LoadData, this, data, setData)
        const result = next.call(this, data)
        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()])
        return result
      },
      requestSave: (next: any) => function (...args: any) {
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.After, this)
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
    const onCanvasChangeListener = this.plugin.app.workspace.on('layout-change', () => {
      const canvas = this.plugin.getCurrentCanvas()
      if (!canvas) return

      this.triggerCanvasChangedEvent(canvas)
      canvas.setData(canvas.getData())
      this.plugin.app.workspace.offref(onCanvasChangeListener)
    })
    this.plugin.registerEvent(onCanvasChangeListener)

    // Trigger instantly (Plugin reload)
    onCanvasChangeListener.fn.call(this.plugin.app.workspace)
  }

  private triggerCanvasChangedEvent(canvas: Canvas) {
    this.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, canvas)
    this.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.After, canvas)
    this.triggerWorkspaceEvent(CanvasEvent.ReadonlyChanged, canvas, canvas.readonly)
    this.triggerWorkspaceEvent(CanvasEvent.NodesChanged, canvas, [...canvas.nodes.values()])
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}