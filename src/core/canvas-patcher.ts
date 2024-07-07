import AdvancedCanvasPlugin from "src/main"
import { BBox, Canvas, CanvasData, CanvasEdge, CanvasEdgeData, CanvasElement, CanvasNode, CanvasNodeData, CanvasView } from "src/@types/Canvas"
import PatchHelper from "src/utils/patch-helper"
import { CanvasEvent } from "./events"
import { WorkspaceLeaf } from "obsidian"
import { around } from "monkey-around"
import JSONC from "tiny-jsonc"

export default class CanvasPatcher {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.applyPatches()
  }

  private async applyPatches() {
    const that = this

    // Get the current canvas view or wait for it to be created
    const canvasView = (
      this.plugin.app.workspace.getLeavesOfType('canvas')?.first()?.view ??
      await new Promise<CanvasView>((resolve) => {
        // @ts-ignore
        const uninstall = around(this.plugin.app.internalPlugins.plugins.canvas.views, {
          canvas: (next: any) => function (...args: any) {
            const result = next.call(this, ...args)

            resolve(result)
            uninstall() // Uninstall the patch

            return result
          }
        })
        this.plugin.register(uninstall)
      })
    ) as CanvasView
    
    // Patch canvas view
    PatchHelper.patchObjectPrototype(this.plugin, canvasView, {
      getViewData: (_next: any) => function (..._args: any) {
        const canvasData = this.canvas.getData()
        canvasData.metadata = this.canvas.metadata ?? {}

        return JSON.stringify(canvasData, null, 2)
      },
      setViewData: (next: any) => function (json: string, ...args: any) {
        let validJson = json
        let parsedJson

        // Check for SyntaxError
        try { parsedJson = JSON.parse(json) }
        catch (e) {
          // Invalid JSON
          that.plugin.createFileSnapshot(this.file.path, json)
          
          // Try to parse it with trailing commas
          parsedJson = JSONC.parse(json)
          validJson = JSON.stringify(parsedJson, null, 2)
        }

        const result = next.call(this, validJson, ...args)

        try { this.canvas.metadata = parsedJson.metadata }
        catch (_e) { this.canvas.metadata = {} }

        that.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, this.canvas)

        return result
      }
    })

    // Patch canvas
    PatchHelper.patchObjectPrototype(this.plugin, canvasView.canvas, {
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
      createTextNode: (next: any) => function (...args: any) {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      },
      createFileNode: (next: any) => function (...args: any) {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      },
      createFileNodes: (next: any) => function (...args: any) {
        const nodes = next.call(this, ...args)
        nodes.forEach((node: CanvasNode) => that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node))
        return nodes
      },
      createGroupNode: (next: any) => function (...args: any) {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      },
      createLinkNode: (next: any) => function (...args: any) {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      },
      addNode: (next: any) => function (node: CanvasNode) {
        that.patchNode(node)
        return next.call(this, node)
      },
      addEdge: (next: any) => function (edge: CanvasEdge) {
        that.patchEdge(edge)
        if (!this.viewportChanged) that.triggerWorkspaceEvent(CanvasEvent.EdgeCreated, this, edge)
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
      /*setData: (next: any) => function (...args: any) {
        //
        const result = next.call(this, ...args)
        //
        return result
      },*/
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

    // Patch canvas popup menu
    PatchHelper.patchObjectPrototype(this.plugin, canvasView.canvas.menu, {
      render: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, this.canvas)
        next.call(this) // Re-Center the popup menu
        return result
      }
    })

    // Patch interaction layer
    PatchHelper.patchObjectPrototype(this.plugin, canvasView.canvas.nodeInteractionLayer, {
      setTarget: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeInteraction, this.canvas, node)
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

    PatchHelper.patchObjectInstance(this.plugin, node, {
      setData: (next: any) => function (data: CanvasNodeData, addHistory?: boolean) {
        const result = next.call(this, data)

        if (node.initialized && !node.isDirty) {
          node.isDirty = true
          that.triggerWorkspaceEvent(CanvasEvent.NodeChanged, this.canvas, node)
          delete node.isDirty
        }

        // Save the data to the file
        this.canvas.data = this.canvas.getData()
        this.canvas.view.requestSave()

        // Add to the undo stack
        if (addHistory) this.canvas.pushHistory(this.canvas.getData())

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

    PatchHelper.patchObjectInstance(this.plugin, edge, {
      setData: (next: any) => function (data: CanvasEdgeData, addHistory?: boolean) {
        const result = next.call(this, data)

        if (edge.initialized && !edge.isDirty) {
          edge.isDirty = true
          that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, edge)
          delete edge.isDirty
        }

        // Save the data to the file
        this.canvas.data = this.canvas.getData()
        this.canvas.view.requestSave()

        // Add to the undo stack
        if (addHistory) this.canvas.pushHistory(this.canvas.getData())

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