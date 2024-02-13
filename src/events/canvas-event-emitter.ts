import AdvancedCanvasPlugin from "src/main"
import { BBox, CanvasData, CanvasEdge, CanvasEdgeData, CanvasNode, CanvasNodeData, CanvasView } from "src/@types/Canvas"
import { patchWorkspaceFunction as patchWorkspaceObject } from "src/utils/patch-helper"
import { CanvasEvent } from "./events"
import { WorkspaceLeaf } from "obsidian"
import { around, dedupe } from "monkey-around"

export default class CanvasEventEmitter {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    const that = this

    // Patch canvas view
    patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvasView(), {
      getViewData: (_next: any) => function (..._args: any) {
        return JSON.stringify(this.canvas.getData(), null, 2)
      },
      setViewData: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, this.canvas)
        return result
      }
    })

    // Patch canvas
    patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvas(), {
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
        const result = next.call(this, update)
        that.triggerWorkspaceEvent(CanvasEvent.SelectionChanged, this, ((update: () => void) => next.call(this, update)))
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
        that.triggerEdgeRelatedEvent(edge, () => {
          that.triggerWorkspaceEvent(CanvasEvent.EdgeAdded, this.canvas, edge)
          that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, edge)
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
        that.triggerWorkspaceEvent(CanvasEvent.Redo, this)
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
          ;[...this.edges.values()].forEach(edge => that.triggerEdgeRelatedEvent(edge, () => // If edge data changed
            that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this, edge)
          ))
        }

        that.triggerWorkspaceEvent(CanvasEvent.LoadData, this, data, setData)
        const result = next.call(this, data)

        that.triggerWorkspaceEvent(CanvasEvent.NodesChanged, this, [...this.nodes.values()]) // If node data changed
        ;[...this.edges.values()].forEach(edge => that.triggerEdgeRelatedEvent(edge, () => // If edge data changed
          that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this, edge)
        ))

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
    patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvas()?.menu, {
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
    patchWorkspaceObject(this.plugin, () => this.plugin.getCurrentCanvas()?.nodeInteractionLayer, {
      setTarget: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeInteraction, this.canvas, node)
        return result
      }
    })

    // Listen to canvas changes
    const onCanvasChangeListener = this.plugin.app.workspace.on('layout-change', () => {
      let canvasPatched = false

      this.plugin.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
        if (leaf.view.getViewType() !== 'canvas') return
        canvasPatched = true

        // Re-init the canvas with the patched canvas object
        const canvasView = leaf.view as CanvasView
        canvasView.setViewData(canvasView.getViewData())

        // Trigger popup menu changed event
        this.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, canvasView.canvas)
      })

      if (!canvasPatched) return
      this.plugin.app.workspace.offref(onCanvasChangeListener)
    })
    this.plugin.registerEvent(onCanvasChangeListener)

    // Trigger instantly (Plugin reload)
    onCanvasChangeListener.fn.call(this.plugin.app.workspace)
  }
  
  private triggerEdgeRelatedEvent(edge: CanvasEdge, onReady: () => void) {
    if (edge.initialized) {
      onReady()
      return
    }

    const that = this

    // Patch edge object
    const uninstaller = around(edge, {
      initialize: (next: any) => function (...args: any) {
        const result = next.call(this, ...args)

        onReady()
        uninstaller() // Uninstall the patch

        return result
      }
    })

    that.plugin.register(uninstaller)
  }

  private triggerWorkspaceEvent(event: string, ...args: any) {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}