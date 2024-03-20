import AdvancedCanvasPlugin from "src/main"
import { BBox, Canvas, CanvasData, CanvasEdge, CanvasElement, CanvasNode, CanvasView } from "src/@types/Canvas"
import { patchObjectInstance, tryPatchWorkspacePrototype as patchWorkspaceObject } from "src/utils/patch-helper"
import { CanvasEvent } from "./events"
import { WorkspaceLeaf } from "obsidian"
import { around } from "monkey-around"

export default class CanvasPatcher {
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
        const canvasData = this.canvas.getData()
        canvasData.metadata = this.canvas.metadata ?? {}

        return JSON.stringify(canvasData, null, 2)
      },
      setViewData: (next: any) => function (json: string, ...args: any) {
        const result = next.call(this, json, ...args)
        this.canvas.metadata = JSON.parse(json).metadata

        that.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, this.canvas)

        return result
      }
    })

    // Patch canvas after patching the canvas view using the non-null canvas view
    await patchWorkspaceObject(this.plugin, () => canvasView?.canvas, {
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
      onDoubleClick: (next: any) => function (event: MouseEvent) {
        const preventDefault = { value: false }
        that.triggerWorkspaceEvent(CanvasEvent.DoubleClick, this, event, preventDefault)
        if (!preventDefault.value) next.call(this, event)
      },
      setDragging: (next: any) => function (dragging: boolean) {
        const result = next.call(this, dragging)
        that.triggerWorkspaceEvent(CanvasEvent.DraggingStateChanged, this, dragging)
        return result
      },
      getContainingNodes: (next: any) => function (bbox: BBox) {
        const result = next.call(this, bbox)
        that.triggerWorkspaceEvent(CanvasEvent.ContainingNodesRequested, this, bbox, result)
        return result
      },
      updateSelection: (next: any) => function (update: () => void) {
        const oldSelection = new Set(this.selection)
        const result = next.call(this, update)
        that.triggerWorkspaceEvent(CanvasEvent.SelectionChanged, this, oldSelection, ((update: () => void) => next.call(this, update)))
        return result
      },
      addNode: (next: any) => function (node: CanvasNode) {
        that.patchNode(node)
        return next.call(this, node)
      },
      addEdge: (next: any) => function (edge: CanvasEdge) {
        that.patchEdge(edge)
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
        this.importData(this.getData(), true) // Force update the canvas data
        that.triggerWorkspaceEvent(CanvasEvent.Undo, this)
        return result
      },
      redo: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        this.importData(this.getData(), true) // Force update the canvas data
        that.triggerWorkspaceEvent(CanvasEvent.Redo, this)
        return result
      },
      getData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.DataRequested, this, result)
        return result
      },
      importData: (next: any) => function (data: CanvasData, clearCanvas?: boolean, silent?: boolean) {
        const targetFilePath = this.view.file.path
        const setData = (data: CanvasData) => {
          // Skip if the canvas got unloaded or the file changed
          if (!this.view.file || this.view.file.path !== targetFilePath) return

          this.importData(data, true, true)
          that.emitEventsForUnknownDataChanges(this)
        }

        if (!silent) that.triggerWorkspaceEvent(CanvasEvent.LoadData, this, data, setData)
        const result = next.call(this, data, clearCanvas)
        that.emitEventsForUnknownDataChanges(this)
        return result
      },
      requestSave: (next: any) => function (...args: any) {
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.After, this)
        return result
      }
    })

    // Canvas is now patched - update all open canvas views
    this.plugin.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
      if (leaf.view.getViewType() !== 'canvas') return

      const canvasView = leaf.view as CanvasView
      // @ts-ignore
      canvasView.leaf.rebuildView()
    })
  }

  private patchNode(node: CanvasNode) {
    const that = this

    patchObjectInstance(this.plugin, node, {
      setData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        if (node.initialized && !node.isDirty) {
          node.isDirty = true
          that.triggerWorkspaceEvent(CanvasEvent.NodeChanged, this.canvas, node)
          delete node.isDirty
        }

        // Save the data to the file
        this.canvas.data = this.canvas.getData()
        this.canvas.view.requestSave()

        return result
      },
      getBBox: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeBBoxRequested, this.canvas, node, result)
        return result
      }
    })
    
    this.runAfterInitialized(node, () => {
      this.triggerWorkspaceEvent(CanvasEvent.NodeAdded, node.canvas, node)
      this.triggerWorkspaceEvent(CanvasEvent.NodeChanged, node.canvas, node)
    })
  }

  private patchEdge(edge: CanvasEdge) {
    const that = this

    patchObjectInstance(this.plugin, edge, {
      setData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        if (edge.initialized && !edge.isDirty) {
          edge.isDirty = true
          that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, edge)
          delete edge.isDirty
        }

        // Save the data to the file
        this.canvas.data = this.canvas.getData()
        this.canvas.view.requestSave()

        return result
      },
      render: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, edge)
        return result
      },
      getCenter: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.EdgeCenterRequested, this.canvas, edge, result)
        return result
      }
    })
    
    this.runAfterInitialized(edge, () => {
      this.triggerWorkspaceEvent(CanvasEvent.EdgeAdded, edge.canvas, edge)
    })
  }
  
  private runAfterInitialized(canvasElement: CanvasElement, onReady: () => void) {
    if (canvasElement.initialized) {
      onReady()
      return
    }

    const that = this

    // Patch CanvasElement object
    const uninstall = around(canvasElement, {
      initialize: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        onReady()
        uninstall() // Uninstall the patch

        return result
      }
    })

    that.plugin.register(uninstall)
  }

  private emitEventsForUnknownDataChanges(canvas: Canvas) {
    // If node data changed
    canvas.nodes.forEach((node: CanvasNode) => this.runAfterInitialized(node, () => {
      this.triggerWorkspaceEvent(CanvasEvent.NodeChanged, node.canvas, node)
    }))

    // If edge data changed
    canvas.edges.forEach((edge: CanvasEdge) => this.runAfterInitialized(edge, () => {
      this.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, edge.canvas, edge)
    }))
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}