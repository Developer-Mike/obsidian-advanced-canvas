import AdvancedCanvasPlugin from "src/main"
import { BBox, Canvas, CanvasData, CanvasEdge, CanvasEdgeData, CanvasNode, CanvasNodeData, CanvasView } from "src/@types/Canvas"
import { patchWorkspaceFunction as patchWorkspaceObject } from "src/utils/patch-helper"
import { CanvasEvent } from "./events"
import { WorkspaceLeaf } from "obsidian"
import { around } from "monkey-around"

export default class CanvasEventEmitter {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.applyPatches()
  }

  private async applyPatches() {
    const that = this
    
    // Patch canvas popup menu
    patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvas()?.menu, {
      render: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, this.canvas)
        next.call(this) // Re-Center the popup menu
        return result
      }
    })

    // Patch interaction layer
    patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvas()?.nodeInteractionLayer, {
      setTarget: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeInteraction, this.canvas, node)
        return result
      }
    })

    // Patch canvas view
    const canvasView = await patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvasView(), {
      getViewData: (_next: any) => function (..._args: any) {
        return JSON.stringify(this.canvas.getData(), null, 2)
      },
      setViewData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, this.canvas)
        return result
      }
    })

    // Patch canvas after patching the canvas view using the non-null canvas view
    await patchWorkspaceObject(this.plugin, () => canvasView?.canvas, {
      // Add custom function
      setNodeData: (_next: any) => function (node: CanvasNode, key: keyof CanvasNodeData, value: any) {
        node.setData({ 
          ...node.getData(),
          [key]: value
        })
        this.requestSave()

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])
      },
      setEdgeData: (_next: any) => function (edge: CanvasEdge, key: keyof CanvasEdgeData, value: any) {
        edge.setData({ 
          ...edge.getData(),
          [key]: value
        })
        this.requestSave()

        that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this, edge)
      },
      markViewportChanged: (next: any) => function (...args: any) {
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.After, this)
        return result
      },
      markMoved: (next: any) => function (node: CanvasNode) {
        that.triggerWorkspaceEvent(CanvasEvent.NodeMoved, this, node)
        return next.call(this, node)
      },
      setDragging: (next: any) => function (dragging: boolean) {
        const result = next.call(this, dragging)
        that.triggerWorkspaceEvent(CanvasEvent.DraggingStateChanged, this, dragging)
        return result
      },
      updateSelection: (next: any) => function (update: () => void) {
        const oldSelection = new Set(this.selection)
        const result = next.call(this, update)
        that.triggerWorkspaceEvent(CanvasEvent.SelectionChanged, this, oldSelection, ((update: () => void) => next.call(this, update)))
        return result
      },
      addNode: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)

        ;(async () => {
          await sleep(1) // Fix obsidian bug where the unknownData doesn't get set
          that.triggerWorkspaceEvent(CanvasEvent.NodeAdded, this, node)
          that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [node])
        })()

        return result
      },
      addEdge: (next: any) => function (edge: CanvasEdge) {
        that.patchEdge(edge)

        that.triggerEdgeRelatedEvent(edge, () => {
          that.triggerWorkspaceEvent(CanvasEvent.EdgeAdded, this, edge)
          // Changed event will be triggered when updatePath is called
        })

        return next.call(this, edge)
      },
      removeNode: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeRemoved, this, node)
        return result
      },
      removeEdge: (next: any) => function (edge: CanvasEdge) {
        const result = next.call(this, edge)
        that.triggerWorkspaceEvent(CanvasEvent.EdgeRemoved, this, edge)
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
        that.triggerWorkspaceEvent(CanvasEvent.Undo, this)
        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()]) // If node data changed
        return result
      },
      redo: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.Redo, this) // TODO
        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()]) // If node data changed
        return result
      },
      getData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.DataRequested, this, result)
        return result
      },
      setData: (next: any) => function (data: CanvasData) {
        const targetFilePath = this.view.file.path
        const setData = (data: CanvasData) => {
          // Skip if the canvas got unloaded or the file changed
          if (!this.view.file || this.view.file.path !== targetFilePath) return

          this.importData(data)
          that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()]) // If node data changed
          // Edge data changed event will be triggered when updatePath is called
        }

        that.triggerWorkspaceEvent(CanvasEvent.LoadData, this, data, setData)
        const result = next.call(this, data)

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()]) // If node data changed
        // Edge data changed event will be triggered when updatePath is called

        return result
      },
      requestSave: (next: any) => function (...args: any) {
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.After, this)
        return result
      }
    })

    // Canvas is now patched - update all open canvases
    this.plugin.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      if (leaf.view.getViewType() !== 'canvas') return

      const canvasView = leaf.view as CanvasView

      // Patch edges
      canvasView.canvas.edges.forEach(edge => this.patchEdge(edge))

      // Trigger nodes/edges added event
      canvasView.canvas.nodes.forEach(node => that.triggerWorkspaceEvent(CanvasEvent.NodeAdded, canvasView.canvas, node))
      canvasView.canvas.edges.forEach(edge => that.triggerWorkspaceEvent(CanvasEvent.EdgeAdded, canvasView.canvas, edge))

      // Re-init the canvas with the patched canvas object
      canvasView.setViewData(canvasView.getViewData())

      // Trigger popup menu changed event
      this.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, canvasView.canvas)
    })
  }

  private patchEdge(edge: CanvasEdge) {
    const that = this

    // Patch edge
    const uninstall = around(edge, {
      updatePath: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, edge)
        return result
      }
    })

    that.plugin.register(uninstall)
  }
  
  private triggerEdgeRelatedEvent(edge: CanvasEdge, onReady: () => void) {
    if (edge.initialized) {
      onReady()
      return
    }

    const that = this

    // Patch edge object
    const uninstall = around(edge, {
      initialize: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        onReady()
        uninstall() // Uninstall the patch

        return result
      }
    })

    that.plugin.register(uninstall)
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}