import { EditorView, ViewUpdate } from "@codemirror/view"
import JSONSS from "json-stable-stringify"
import { around } from "monkey-around"
import { editorInfoField, requireApiVersion, Side, WorkspaceLeaf } from "obsidian"
import { BBox, Canvas, CanvasData, CanvasEdge, CanvasEdgeData, CanvasElement, CanvasNode, CanvasNodeData, CanvasPopupMenu, CanvasView, CanvasWorkspaceLeaf, NodeInteractionLayer, Position, SelectionData } from "src/@types/Canvas"
import PatchHelper from "src/utils/patch-helper"
import JSONC from "tiny-jsonc"
import { CanvasEvent } from "../events"
import Patcher from "./patcher"
import BBoxHelper from "src/utils/bbox-helper"

export default class CanvasPatcher extends Patcher {
  protected async patch() {
    const that = this

    // Wait for layout ready -> Support deferred view initialization
    await new Promise<void>(resolve => this.plugin.app.workspace.onLayoutReady(() => resolve()))

    // Get the current canvas view fully loaded
    const getCanvasView = async (): Promise<CanvasView | null> => {
      const canvasLeaf = this.plugin.app.workspace.getLeavesOfType('canvas')?.first()
      if (!canvasLeaf) return null

      if (requireApiVersion('1.7.2')) await canvasLeaf.loadIfDeferred() // Load the canvas if the view is deferred
      return canvasLeaf.view as CanvasView
    }

    // Get the current canvas view or wait for it to be created
    let canvasView = await getCanvasView()
    canvasView ??= await new Promise<CanvasView>(resolve => {
      const event = this.plugin.app.workspace.on('layout-change', async () => {
        const newCanvasView = await getCanvasView()
        if (!newCanvasView) return

        resolve(newCanvasView)
        this.plugin.app.workspace.offref(event)
      })

      this.plugin.registerEvent(event)
    })
    
    // Patch canvas view
    PatchHelper.patchPrototype<CanvasView>(this.plugin, canvasView, {
      getViewData: PatchHelper.OverrideExisting(next => function (...args: any): string {
        const canvasData = this.canvas.getData()

        try {
          const stringified = JSONSS(canvasData, { space: 2 })
          if (stringified === undefined) throw new Error('Failed to stringify canvas data using json-stable-stringify')
            
          return stringified
        } catch (e) {
          console.error('Failed to stringify canvas data using json-stable-stringify:', e)

          try {
            return JSON.stringify(canvasData, null, 2)
          } catch (e) {
            console.error('Failed to stringify canvas data using JSON.stringify:', e)
            return next.call(this, ...args)
          }
        }
      }),
      setViewData: PatchHelper.OverrideExisting(next => function (json: string, ...args: any): void {
        json = json !== '' ? json : '{}'

        let result
        try {
          result = next.call(this, json, ...args)
        } catch (e) {
          console.error('Invalid JSON, repairing through Advanced Canvas:', e)

          // Invalid JSON
          if (this.file) that.plugin.createFileSnapshot(this.file.path, json)

          // Try to parse it with trailing commas
          json = JSON.stringify(JSONC.parse(json), null, 2)
          result = next.call(this, json, ...args)
        }

        that.triggerWorkspaceEvent(CanvasEvent.CanvasChanged, this.canvas)
        return result
      })
    })

    // Patch canvas
    PatchHelper.patchPrototype<Canvas>(this.plugin, canvasView.canvas, {
      markViewportChanged: PatchHelper.OverrideExisting(next => function (...args: any): void {
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.ViewportChanged.After, this)
        return result
      }),
      markMoved: PatchHelper.OverrideExisting(next => function (node: CanvasNode): void {
        const result = next.call(this, node)

        if (!this.viewportChanged) {
          if (node.prevX !== node.x || node.prevY !== node.y)
            that.triggerWorkspaceEvent(CanvasEvent.NodeMoved, this, node, !this.isDragging)

          if (node.prevWidth !== node.width || node.prevHeight !== node.height)
            that.triggerWorkspaceEvent(CanvasEvent.NodeResized, this, node)
        }

        // Save the current position and size
        node.prevX = node.x
        node.prevY = node.y
        node.prevWidth = node.width
        node.prevHeight = node.height

        return result
      }),
      onDoubleClick: PatchHelper.OverrideExisting(next => function (event: MouseEvent): void {
        const preventDefault = { value: false }
        that.triggerWorkspaceEvent(CanvasEvent.DoubleClick, this, event, preventDefault)
        if (!preventDefault.value) next.call(this, event)
      }),
      setDragging: PatchHelper.OverrideExisting(next => function (dragging: boolean): void {
        const result = next.call(this, dragging)
        that.triggerWorkspaceEvent(CanvasEvent.DraggingStateChanged, this, dragging)
        return result
      }),
      getContainingNodes: PatchHelper.OverrideExisting(next => function (bbox: BBox): CanvasNode[] {
        const result = next.call(this, bbox)
        that.triggerWorkspaceEvent(CanvasEvent.ContainingNodesRequested, this, bbox, result)
        return result
      }),
      updateSelection: PatchHelper.OverrideExisting(next => function (update: () => void): void {
        const oldSelection = new Set(this.selection)
        const result = next.call(this, update)
        that.triggerWorkspaceEvent(CanvasEvent.SelectionChanged, this, oldSelection, ((update: () => void) => next.call(this, update)))
        return result
      }),
      createTextNode: PatchHelper.OverrideExisting(next => function (...args: any): CanvasNode {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      }),
      createFileNode: PatchHelper.OverrideExisting(next => function (...args: any): CanvasNode {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      }),
      createFileNodes: PatchHelper.OverrideExisting(next => function (...args: any): CanvasNode[] {
        const nodes = next.call(this, ...args)
        nodes.forEach((node: CanvasNode) => that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node))
        return nodes
      }),
      createGroupNode: PatchHelper.OverrideExisting(next => function (...args: any): CanvasNode {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      }),
      createLinkNode: PatchHelper.OverrideExisting(next => function (...args: any): CanvasNode {
        const node = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeCreated, this, node)
        return node
      }),
      addNode: PatchHelper.OverrideExisting(next => function (node: CanvasNode): void {
        that.patchNode(node)
        return next.call(this, node)
      }),
      addEdge: PatchHelper.OverrideExisting(next => function (edge: CanvasEdge): void {
        that.patchEdge(edge)
        if (!this.viewportChanged) that.triggerWorkspaceEvent(CanvasEvent.EdgeCreated, this, edge)
        return next.call(this, edge)
      }),
      removeNode: PatchHelper.OverrideExisting(next => function (node: CanvasNode): void {
        const result = next.call(this, node)
        if (!this.isClearing) that.triggerWorkspaceEvent(CanvasEvent.NodeRemoved, this, node)
        return result
      }),
      removeEdge: PatchHelper.OverrideExisting(next => function (edge: CanvasEdge): void {
        const result = next.call(this, edge)
        if (!this.isClearing) that.triggerWorkspaceEvent(CanvasEvent.EdgeRemoved, this, edge)
        return result
      }),
      handleCopy: PatchHelper.OverrideExisting(next => function (...args: any): void {
        this.isCopying = true
        const result = next.call(this, ...args)
        this.isCopying = false

        return result
      }),
      getSelectionData: PatchHelper.OverrideExisting(next => function (...args: any): SelectionData {
        const result = next.call(this, ...args)
        if (this.isCopying) that.triggerWorkspaceEvent(CanvasEvent.OnCopy, this, result)
        return result
      }),
      zoomToBbox: PatchHelper.OverrideExisting(next => function (bbox: BBox): void {
        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.Before, this, bbox)
        const result = next.call(this, bbox)
        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.After, this, bbox)
        return result
      }),
      // Custom
      zoomToRealBbox: (_next: any) => function (bbox: BBox): void {
        if (this.canvasRect.width === 0 || this.canvasRect.height === 0) return

        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.Before, this, bbox)
    
        const widthZoom = this.canvasRect.width / (bbox.maxX - bbox.minX)
        const heightZoom = this.canvasRect.height / (bbox.maxY - bbox.minY)
        const zoom = this.screenshotting ? Math.min(widthZoom, heightZoom) : Math.clamp(Math.min(widthZoom, heightZoom), -4, 1)
        this.tZoom = Math.log2(zoom)
        this.zoomCenter = null
    
        this.tx = (bbox.minX + bbox.maxX) / 2
        this.ty = (bbox.minY + bbox.maxY) / 2
        
        this.markViewportChanged()

        that.triggerWorkspaceEvent(CanvasEvent.ZoomToBbox.After, this, bbox)
      },
      setReadonly: PatchHelper.OverrideExisting(next => function (readonly: boolean): void {
        const result = next.call(this, readonly)
        that.triggerWorkspaceEvent(CanvasEvent.ReadonlyChanged, this, readonly)
        return result
      }),
      undo: PatchHelper.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)
        this.importData(this.getData(), true) // Force update the canvas data
        that.triggerWorkspaceEvent(CanvasEvent.Undo, this)
        return result
      }),
      redo: PatchHelper.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)
        this.importData(this.getData(), true) // Force update the canvas data
        that.triggerWorkspaceEvent(CanvasEvent.Redo, this)
        return result
      }),
      clear: PatchHelper.OverrideExisting(next => function (...args: any): void {
        this.isClearing = true
        const result = next.call(this, ...args)
        this.isClearing = false
        return result
      }),
      /*setData: PatchHelper.OverrideExisting(next => function (...args: any): void {
        //
        const result = next.call(this, ...args)
        //
        return result
      }),*/
      getData: PatchHelper.OverrideExisting(next => function (...args: any): CanvasData {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.DataRequested, this, result)
        return result
      }),
      importData: PatchHelper.OverrideExisting(next => function (data: CanvasData, clearCanvas?: boolean, silent?: boolean): void {
        const targetFilePath = this.view.file.path
        const setData = (data: CanvasData) => {
          // Skip if the canvas got unloaded or the file changed
          if (!this.view.file || this.view.file.path !== targetFilePath) return

          this.importData(data, true, true)
        }

        if (!silent) that.triggerWorkspaceEvent(CanvasEvent.LoadData, this, data, setData)
        const result = next.call(this, data, clearCanvas)

        return result
      }),
      requestSave: PatchHelper.OverrideExisting(next => function (...args: any): void {
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.Before, this)
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.CanvasSaved.After, this)
        return result
      })
    })

    // Patch canvas popup menu
    PatchHelper.patchPrototype<CanvasPopupMenu>(this.plugin, canvasView.canvas.menu, {
      render: PatchHelper.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.PopupMenuCreated, this.canvas)
        next.call(this) // Re-Center the popup menu
        return result
      })
    })

    // Patch interaction layer
    PatchHelper.patchPrototype<NodeInteractionLayer>(this.plugin, canvasView.canvas.nodeInteractionLayer, {
      setTarget: PatchHelper.OverrideExisting(next => function (node: CanvasNode): void {
        const result = next.call(this, node)
        that.triggerWorkspaceEvent(CanvasEvent.NodeInteraction, this.canvas, node)
        return result
      })
    })

    // Add editor extension for node text content change listener
    this.plugin.registerEditorExtension([EditorView.updateListener.of((update: ViewUpdate) => {
      if (!update.docChanged) return

      const editor = update.state.field(editorInfoField) as any
      const node = editor.node as CanvasNode | undefined
      if (!node) return

      that.triggerWorkspaceEvent(CanvasEvent.NodeTextContentChanged, node.canvas, node, update)
    })])

    // Canvas is now patched - update all open canvas views
    this.plugin.app.workspace.iterateAllLeaves(async (leaf: WorkspaceLeaf) => {
      if (leaf.view.getViewType() !== 'canvas') return

      const canvasView = leaf.view as any as Omit<CanvasView, 'onClose'> & { onClose: () => void }
      const currentData = canvasView.getViewData()
      const savedData = canvasView.file ? await this.plugin.app.vault.read(canvasView.file) : null
      const hasChangesToSave = currentData !== savedData

      console.debug(`Reloading canvas view (Saving: ${hasChangesToSave})`)

      // Skip saving the canvas data if there are no changes to save (Remote sync compatibility)
      const originalOnClose = canvasView.onClose
      if (!hasChangesToSave) canvasView.onClose = () => canvasView.canvas?.unload()

      canvasView.leaf.rebuildView()

      if (!hasChangesToSave) canvasView.onClose = originalOnClose
    })
  }

  private patchNode(node: CanvasNode) {
    const that = this

    PatchHelper.patch<CanvasNode>(this.plugin, node, {
      setData: PatchHelper.OverrideExisting(next => function (data: CanvasNodeData, addHistory?: boolean): void {
        const result = next.call(this, data)

        if (node.initialized && !node.isDirty) {
          node.isDirty = true
          that.triggerWorkspaceEvent(CanvasEvent.NodeChanged, this.canvas, node)
          delete node.isDirty
        }

        // Save the data to the file (only if the canvas isn't loading)
        this.canvas.data = this.canvas.getData()
        if (this.initialized) this.canvas.view.requestSave()

        // Add to the undo stack
        if (addHistory) this.canvas.pushHistory(this.canvas.data)

        return result
      }),
      setIsEditing: PatchHelper.OverrideExisting(next => function (editing: boolean, ...args: any): void {
        const result = next.call(this, editing, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeEditingStateChanged, this.canvas, node, editing)
        return result
      }),
      updateBreakpoint: PatchHelper.OverrideExisting(next => function (breakpoint: boolean): void {
        const breakpointRef = { value: breakpoint }
        that.triggerWorkspaceEvent(CanvasEvent.NodeBreakpointChanged, this.canvas, node, breakpointRef)
        return next.call(this, breakpointRef.value)
      }),
      getBBox: PatchHelper.OverrideExisting(next => function (...args: any): BBox {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.NodeBBoxRequested, this.canvas, node, result)
        return result
      }),
      onConnectionPointerdown: PatchHelper.OverrideExisting(next => function (e: PointerEvent, side: Side): void {
        const addEdgeEventRef = that.plugin.app.workspace.on(CanvasEvent.EdgeAdded, (_canvas: Canvas, edge: CanvasEdge) => {
          that.triggerWorkspaceEvent(CanvasEvent.EdgeConnectionDragging.Before, this.canvas, edge, e, true, "to")
          that.plugin.app.workspace.offref(addEdgeEventRef)

          // Listen for pointer up event
          document.addEventListener('pointerup', (e: PointerEvent) => {
            that.triggerWorkspaceEvent(CanvasEvent.EdgeConnectionDragging.After, this.canvas, edge, e, true, "to")
          }, { once: true })
        })

        const result = next.call(this, e, side)
        return result
      }),
    })
    
    this.runAfterInitialized(node, () => {
      this.triggerWorkspaceEvent(CanvasEvent.NodeAdded, node.canvas, node)
      this.triggerWorkspaceEvent(CanvasEvent.NodeChanged, node.canvas, node)
    })
  }

  private patchEdge(edge: CanvasEdge) {
    const that = this

    PatchHelper.patch<CanvasEdge>(this.plugin, edge, {
      setData: PatchHelper.OverrideExisting(next => function (data: CanvasEdgeData, addHistory?: boolean): void {
        const result = next.call(this, data)

        if (this.initialized && !this.isDirty) {
          this.isDirty = true
          that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, this)
          delete this.isDirty
        }

        // Save the data to the file (only if the canvas isn't loading)
        this.canvas.data = this.canvas.getData()
        if (this.initialized) this.canvas.view.requestSave()

        // Add to the undo stack
        if (addHistory) this.canvas.pushHistory(this.canvas.getData())

        return result
      }),
      render: PatchHelper.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, this.canvas, this)
        return result
      }),
      getCenter: PatchHelper.OverrideExisting(next => function (...args: any): Position {
        const result = next.call(this, ...args)
        that.triggerWorkspaceEvent(CanvasEvent.EdgeCenterRequested, this.canvas, this, result)
        return result
      }),
      onConnectionPointerdown: PatchHelper.OverrideExisting(next => function (e: PointerEvent): void {
        const result = next.call(this, e)

        // a = i.posFromEvt(e)
        // s = M$(r.node.getBBox(), r.side)
        // l = M$(o.node.getBBox(), o.side)
        // c = Hl(a, s) > Hl(a, l) ? "to" : "from"
        const eventPos = this.canvas.posFromEvt(e)
        const fromPos = BBoxHelper.getCenterOfBBoxSide(this.from.node.getBBox(), this.from.side)
        const toPos = BBoxHelper.getCenterOfBBoxSide(this.to.node.getBBox(), this.to.side)
        const draggingSide = Math.hypot(eventPos.x - fromPos.x, eventPos.y - fromPos.y) > Math.hypot(eventPos.x - toPos.x, eventPos.y - toPos.y) ? "to" : "from"

        that.triggerWorkspaceEvent(CanvasEvent.EdgeConnectionDragging.Before, this.canvas, this, e, false, draggingSide)
        document.addEventListener('pointerup', (e: PointerEvent) => {
          that.triggerWorkspaceEvent(CanvasEvent.EdgeConnectionDragging.After, this.canvas, this, e, false, draggingSide)
        }, { once: true })

        return result
      }),
    })
    
    this.runAfterInitialized(edge, () => {
      this.triggerWorkspaceEvent(CanvasEvent.EdgeAdded, edge.canvas, edge)
      // this.triggerWorkspaceEvent(CanvasEvent.EdgeChanged, edge.canvas, edge) - already fired in render function
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
      initialize: next => function (...args: any): void {
        const result = next.call(this, ...args)

        onReady()
        uninstall() // Uninstall the patch

        return result
      }
    })

    that.plugin.register(uninstall)
  }

  private triggerWorkspaceEvent(event: string, ...args: any): void {
    this.plugin.app.workspace.trigger(event, ...args)
  }
}
