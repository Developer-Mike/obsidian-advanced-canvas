/* eslint-disable-next-line import/no-extraneous-dependencies -- Included in Obsidian */
import { EditorView, ViewUpdate } from "@codemirror/view"
import { around } from "monkey-around"
import { editorInfoField, requireApiVersion, Side, WorkspaceLeaf } from "obsidian"
import { CanvasData, CanvasEdgeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"
import { BBox, Canvas, CanvasEdge, CanvasElement, CanvasElementsData, CanvasEphemeralState, CanvasNode, CanvasPopupMenu, CanvasView, CanvasWorkspaceLeaf, NodeInteractionLayer, Position, SelectionData } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import MigrationHelper from "src/utils/migration-helper"
import JSONC from "tiny-jsonc"
import Patcher, { invoke } from "./patcher"

export default class CanvasPatcher extends Patcher {
  protected async patch() {
    // Check if there are already loaded canvas view leafs
    const loadedCanvasViewLeafs = this.plugin.app.workspace.getLeavesOfType("canvas")
      .filter((leaf: WorkspaceLeaf) => !requireApiVersion('1.7.2') || !leaf.isDeferred)

    if (loadedCanvasViewLeafs.length > 0) {
      console.debug(`Patching and reloading loaded canvas views (Count: ${loadedCanvasViewLeafs.length})`)

      // Patch the loaded canvas views
      this.patchCanvas(loadedCanvasViewLeafs.first()!.view as unknown as CanvasView)

      // Reload the canvas views
      for (const leaf of loadedCanvasViewLeafs) void (leaf as unknown as CanvasWorkspaceLeaf).rebuildView()
    } else {
      // Patch the canvas view as soon it gets requested
      await Patcher.waitForViewRequest<CanvasView>(this.plugin, "canvas", view => this.patchCanvas(view))
      console.debug(`Patched canvas view on first request`)
    }
  }

  private patchCanvas(view: CanvasView) {
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    // Patch canvas view
    Patcher.patchPrototype<CanvasView>(this.plugin, view, {
      setEphemeralState: Patcher.OverrideExisting(next => function (state: unknown): void {
        const s = state as CanvasEphemeralState
        // Select and zoom to the node if it exists (Link subpath)
        if (s?.subpath) {
          const nodeId = (s.subpath).replace(/^#/, '')
          const node = this.canvas.nodes.get(nodeId)

          if (node) {
            this.canvas.selectOnly(node)
            this.canvas.zoomToSelection()
            return
          }
        }

        // Select and zoom to the node if match exists (backlink) but no nodeId is specified (metadataCache limitation) - if nodeId exists, it comes from search
        if (s.match?.matches?.[0] && !s.match?.nodeId) {
          const match = s.match.matches[0]

          const elementType = match[0] === 0 ? 'nodes' : 'edges' // Misuse start offset as element type indicator
          const elementIndex = match[1] // Misuse end offset as element index

          const element = elementType === 'nodes' ?
            Array.from(this.canvas.nodes.values())[elementIndex] :
            Array.from(this.canvas.edges.values())[elementIndex]

          if (element) {
            this.canvas.selectOnly(element)
            this.canvas.zoomToSelection()
            return
          }
        }

        return invoke(next, this, state)
      }),
      setViewData: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        let [json, ...rest] = args
        json = json !== '' ? json : '{"nodes": [], "edges": []}'

        try {
          const canvasData = JSONC.parse(json) as CanvasData

          // Check if the canvas data needs migration and migrate it
          if (MigrationHelper.needsMigration(canvasData)) {
            if (this.file) that.plugin.createFileSnapshot(this.file.path, json)
            json = JSON.stringify(MigrationHelper.migrate(canvasData))
          }
        } catch (e) {
          console.error('Failed to migrate canvas data:', e)
        }

        let result
        try {
          result = invoke(next, this, json, ...rest)
        } catch (e) {
          console.error('Invalid JSON, repairing through Advanced Canvas:', e)

          // Invalid JSON
          if (this.file) that.plugin.createFileSnapshot(this.file.path, json)

          // Try to parse it with trailing commas
          json = JSON.stringify(JSONC.parse(json), null, 2)
          result = invoke(next, this, json, ...rest)
        }

        that.plugin.app.workspace.trigger('advanced-canvas:canvas-changed', this.canvas)
        return result
      }),
      close: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        that.plugin.app.workspace.trigger('advanced-canvas:canvas-view-unloaded:before', this)
        return invoke(next, this, ...args)
      }),
    })

    // Patch canvas
    Patcher.patchPrototype<Canvas>(this.plugin, view.canvas, {
      markViewportChanged: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        that.plugin.app.workspace.trigger('advanced-canvas:viewport-changed:before', this)
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:viewport-changed:after', this)
        return result
      }),
      markMoved: Patcher.OverrideExisting(next => function (node: CanvasNode): void {
        const result = invoke(next, this, node)

        if (!this.viewportChanged) {
          if (node.prevX !== node.x || node.prevY !== node.y)
            that.plugin.app.workspace.trigger('advanced-canvas:node-moved', this, node, !this.isDragging)

          if (node.prevWidth !== node.width || node.prevHeight !== node.height)
            that.plugin.app.workspace.trigger('advanced-canvas:node-resized', this, node)
        }

        // Save the current position and size
        node.prevX = node.x
        node.prevY = node.y
        node.prevWidth = node.width
        node.prevHeight = node.height

        return result
      }),
      onDoubleClick: Patcher.OverrideExisting(next => function (event: MouseEvent): void {
        const preventDefault = { value: false }
        that.plugin.app.workspace.trigger('advanced-canvas:double-click', this, event, preventDefault)
        if (!preventDefault.value) invoke(next, this, event)
      }),
      setDragging: Patcher.OverrideExisting(next => function (dragging: boolean): void {
        const result = invoke(next, this, dragging)
        that.plugin.app.workspace.trigger('advanced-canvas:dragging-state-changed', this, dragging)
        return result
      }),
      // OBSIDIAN-FIX
      cloneData: Patcher.OverrideExisting(next => function (elements: CanvasElementsData, shift: Position): CanvasElementsData {
        const result = invoke(next, this, elements, shift)

        // Deep clone the data to avoid modifying the original data
        elements.nodes = elements.nodes.map(nodeData => JSON.parse(JSON.stringify(nodeData)) as CanvasNodeData)
        elements.edges = elements.edges.map(edgeData => JSON.parse(JSON.stringify(edgeData)) as CanvasEdgeData)

        return result
      }),
      getContainingNodes: Patcher.OverrideExisting(next => function (bbox: BBox): CanvasNode[] {
        const result = invoke(next, this, bbox)
        that.plugin.app.workspace.trigger('advanced-canvas:containing-nodes-requested', this, bbox, result)
        return result
      }),
      updateSelection: Patcher.OverrideExisting(next => function (update: () => void): void {
        const oldSelection = new Set(this.selection)
        const result = invoke(next, this, update)
        that.plugin.app.workspace.trigger('advanced-canvas:selection-changed', this, oldSelection, (update: () => void) => invoke(next, this, update))
        return result
      }),
      createTextNode: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): CanvasNode {
        const node = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-created', this, node)
        return node
      }),
      createFileNode: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): CanvasNode {
        const node = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-created', this, node)
        return node
      }),
      createFileNodes: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): CanvasNode[] {
        const nodes = invoke(next, this, ...args)
        nodes.forEach((node: CanvasNode) => that.plugin.app.workspace.trigger('advanced-canvas:node-created', this, node))
        return nodes
      }),
      createGroupNode: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): CanvasNode {
        const node = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-created', this, node)
        return node
      }),
      createLinkNode: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): CanvasNode {
        const node = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-created', this, node)
        return node
      }),
      addNode: Patcher.OverrideExisting(next => function (node: CanvasNode): void {
        that.patchNode(node)
        return invoke(next, this, node)
      }),
      addEdge: Patcher.OverrideExisting(next => function (edge: CanvasEdge): void {
        that.patchEdge(edge)
        if (!this.viewportChanged) that.plugin.app.workspace.trigger('advanced-canvas:edge-created', this, edge)
        return invoke(next, this, edge)
      }),
      removeNode: Patcher.OverrideExisting(next => function (node: CanvasNode): void {
        const result = invoke(next, this, node)
        if (!this.isClearing) that.plugin.app.workspace.trigger('advanced-canvas:node-removed', this, node)
        return result
      }),
      removeEdge: Patcher.OverrideExisting(next => function (edge: CanvasEdge): void {
        const result = invoke(next, this, edge)
        if (!this.isClearing) that.plugin.app.workspace.trigger('advanced-canvas:edge-removed', this, edge)
        return result
      }),
      handleCopy: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        this.isCopying = true
        const result = invoke(next, this, ...args)
        this.isCopying = false

        return result
      }),
      handlePaste: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        this.isPasting = true
        const result = invoke(next, this, ...args)
        this.isPasting = false

        return result
      }),
      getSelectionData: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): SelectionData {
        const result = invoke(next, this, ...args)
        if (this.isCopying) that.plugin.app.workspace.trigger('advanced-canvas:copy', this, result)
        return result
      }),
      zoomToBbox: Patcher.OverrideExisting(next => function (bbox: BBox): void {
        that.plugin.app.workspace.trigger('advanced-canvas:zoom-to-bbox:before', this, bbox)
        const result = invoke(next, this, bbox)
        that.plugin.app.workspace.trigger('advanced-canvas:zoom-to-bbox:after', this, bbox)
        return result
      }),
      // Custom
      zoomToRealBbox: (_next: unknown) => function (bbox: BBox): void {
        if (this.canvasRect.width === 0 || this.canvasRect.height === 0) return

        that.plugin.app.workspace.trigger('advanced-canvas:zoom-to-bbox:before', this, bbox)

        const widthZoom = this.canvasRect.width / (bbox.maxX - bbox.minX)
        const heightZoom = this.canvasRect.height / (bbox.maxY - bbox.minY)
        const zoom = this.screenshotting ? Math.min(widthZoom, heightZoom) : Math.clamp(Math.min(widthZoom, heightZoom), -4, 1)
        this.tZoom = Math.log2(zoom)
        this.zoomCenter = null

        this.tx = (bbox.minX + bbox.maxX) / 2
        this.ty = (bbox.minY + bbox.maxY) / 2

        this.markViewportChanged()

        that.plugin.app.workspace.trigger('advanced-canvas:zoom-to-bbox:after', this, bbox)
      },
      setReadonly: Patcher.OverrideExisting(next => function (readonly: boolean): void {
        const result = invoke(next, this, readonly)
        that.plugin.app.workspace.trigger('advanced-canvas:readonly-changed', this, readonly)
        return result
      }),
      undo: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        this.importData(this.getData(), true) // Force update the canvas data
        that.plugin.app.workspace.trigger('advanced-canvas:undo', this)
        return result
      }),
      redo: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        this.importData(this.getData(), true) // Force update the canvas data
        that.plugin.app.workspace.trigger('advanced-canvas:redo', this)
        return result
      }),
      clear: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        this.isClearing = true
        const result = invoke(next, this, ...args)
        this.isClearing = false
        return result
      }),
      /*setData: Patcher.OverrideExisting(next => function (...args: any): void {
        //
        const result = invoke(next, this, ...args)
        //
        return result
      }),*/
      getData: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): CanvasData {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:data-requested', this, result)
        return result
      }),
      importData: Patcher.OverrideExisting(next => function (data: CanvasData, clearCanvas?: boolean, silent?: boolean): void {
        const targetFilePath = this.view.file?.path
        const setData = (data: CanvasData) => {
          // Skip if the canvas got unloaded or the file changed
          if (!this.view.file || this.view.file.path !== targetFilePath) return

          this.importData(data, true, true)
        }

        if (!silent) that.plugin.app.workspace.trigger('advanced-canvas:data-loaded:before', this, data, setData)
        const result = invoke(next, this, data, clearCanvas)
        if (!silent) that.plugin.app.workspace.trigger('advanced-canvas:data-loaded:after', this, data, setData)

        return result
      }),
      requestSave: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        that.plugin.app.workspace.trigger('advanced-canvas:canvas-saved:before', this)
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:canvas-saved:after', this)
        return result
      })
    })

    // Patch canvas popup menu
    Patcher.patchPrototype<CanvasPopupMenu>(this.plugin, view.canvas.menu, {
      render: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:popup-menu-created', this.canvas)
        invoke(next, this) // Re-Center the popup menu
        return result
      })
    })

    // Patch interaction layer
    Patcher.patchPrototype<NodeInteractionLayer>(this.plugin, view.canvas.nodeInteractionLayer, {
      setTarget: Patcher.OverrideExisting(next => function (node: CanvasNode): void {
        const result = invoke(next, this, node)
        that.plugin.app.workspace.trigger('advanced-canvas:node-interaction', this.canvas, node)
        return result
      })
    })

    // Add editor extension for node text content change listener
    this.plugin.registerEditorExtension([EditorView.updateListener.of((update: ViewUpdate) => {
      if (!update.docChanged) return

      const editor = update.state.field(editorInfoField) as { node?: CanvasNode }
      const node = editor.node
      if (!node) return

      that.plugin.app.workspace.trigger('advanced-canvas:node-text-content-changed', node.canvas, node, update)
    })])
  }

  private patchNode(node: CanvasNode) {
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    Patcher.patch<CanvasNode>(this.plugin, node, {
      render: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-rendered', this.canvas, node)
        return result
      }),
      setData: Patcher.OverrideExisting(next => function (data: CanvasNodeData, addHistory?: boolean): void {
        const result = invoke(next, this, data)

        if (node.initialized && !node.isDirty) {
          node.isDirty = true
          that.plugin.app.workspace.trigger('advanced-canvas:node-changed', this.canvas, node)
          delete node.isDirty
        }

        // Save the data to the file (only if the canvas isn't loading)
        const canvasWithData = this.canvas as { data: CanvasData }
        canvasWithData.data = this.canvas.getData()
        if (this.initialized) this.canvas.view.requestSave()

        // Add to the undo stack
        if (addHistory) this.canvas.pushHistory(canvasWithData.data)

        return result
      }),
      setZIndex: _next => function (value?: number): void {
        this.setData({
          ...this.getData(),
          zIndex: value,
        }, true)

        // Render the node to update the zIndex
        this.updateZIndex()
      },
      updateZIndex: Patcher.OverrideExisting(next => function (): void {
        const persistentZIndex = this.getData().zIndex

        // If no persistent zIndex is set, use the dynamic zIndex
        if (persistentZIndex === undefined) return invoke(next, this)

        // Update the min zIndex of dynamic zIndex -> so everything is above the current persistent zIndex
        this.canvas.zIndexCounter = Math.max(this.canvas.zIndexCounter, persistentZIndex)

        // Set the zIndex to the persistent zIndex and render it
        this.renderZIndex()
      }),
      renderZIndex: Patcher.OverrideExisting(next => function (): void {
        const persistentZIndex = this.getData().zIndex

        // If no persistent zIndex is set, use the dynamic zIndex
        if (persistentZIndex === undefined) return invoke(next, this)

        // Use the persistent zIndex
        this.zIndex = persistentZIndex

        // If selected, always set the zIndex to the max
        if (this.canvas.selection.size === 1 && this.canvas.selection.has(this))
          this.zIndex = this.canvas.zIndexCounter + 1

        this.nodeEl.style.zIndex = this.zIndex.toString()
      }),
      setIsEditing: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        const [editing] = args
        that.plugin.app.workspace.trigger('advanced-canvas:node-editing-state-changed', this.canvas, node, editing)
        return result
      }),
      updateBreakpoint: Patcher.OverrideExisting(next => function (breakpoint: boolean): void {
        const breakpointRef = { value: breakpoint }
        that.plugin.app.workspace.trigger('advanced-canvas:node-breakpoint-changed', this.canvas, node, breakpointRef)
        return invoke(next, this, breakpointRef.value)
      }),
      getBBox: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): BBox {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-bbox-requested', this.canvas, node, result)
        return result
      }),
      onConnectionPointerdown: Patcher.OverrideExisting(next => function (e: PointerEvent, side: Side): void {
        const addEdgeEventRef = that.plugin.app.workspace.on('advanced-canvas:edge-added', (_canvas: Canvas, edge: CanvasEdge) => {
          that.plugin.app.workspace.trigger('advanced-canvas:edge-connection-dragging:before', this.canvas, edge, e, true, "to")
          that.plugin.app.workspace.offref(addEdgeEventRef)

          // Listen for pointer up event
          activeDocument.addEventListener('pointerup', (e: PointerEvent) => {
            that.plugin.app.workspace.trigger('advanced-canvas:edge-connection-dragging:after', this.canvas, edge, e, true, "to")
          }, { once: true })
        })

        const result = invoke(next, this, e, side)
        return result
      }),
      // File nodes
      setFile: next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-changed', this.canvas, this)
        return result
      },
      setFilePath: next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:node-changed', this.canvas, this)
        return result
      }
    })

    this.runAfterInitialized(node, () => {
      this.plugin.app.workspace.trigger('advanced-canvas:node-added', node.canvas, node)
      this.plugin.app.workspace.trigger('advanced-canvas:node-changed', node.canvas, node)
    })
  }

  private patchEdge(edge: CanvasEdge) {
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    Patcher.patch<CanvasEdge>(this.plugin, edge, {
      setData: Patcher.OverrideExisting(next => function (data: CanvasEdgeData, addHistory?: boolean): void {
        const result = invoke(next, this, data)

        if (this.initialized && !this.isDirty) {
          this.isDirty = true
          that.plugin.app.workspace.trigger('advanced-canvas:edge-changed', this.canvas, this)
          delete this.isDirty
        }

        // Save the data to the file (only if the canvas isn't loading)
        const canvasWithData = this.canvas as { data: CanvasData }
        canvasWithData.data = this.canvas.getData()
        if (this.initialized) this.canvas.view.requestSave()

        // Add to the undo stack
        if (addHistory) this.canvas.pushHistory(this.canvas.getData())

        return result
      }),
      render: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:edge-changed', this.canvas, this)

        // TODO: EdgeStyleExtension console.count(`Edge Rendered ${this.canvas.isClearing}`)

        return result
      }),
      getCenter: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): Position {
        const result = invoke(next, this, ...args)
        that.plugin.app.workspace.trigger('advanced-canvas:edge-center-requested', this.canvas, this, result)
        return result
      }),
      onConnectionPointerdown: Patcher.OverrideExisting(next => function (e: PointerEvent): void {
        const cancelRef = { value: false }
        that.plugin.app.workspace.trigger('advanced-canvas:edge-connection-try-dragging:before', this.canvas, this, e, cancelRef)
        if (cancelRef.value) return

        // Save the previous ends
        const previousEnds = { from: this.from, to: this.to }

        const result = invoke(next, this, e)

        // a = i.posFromEvt(e)
        // s = M$(r.node.getBBox(), r.side)
        // l = M$(o.node.getBBox(), o.side)
        // c = Hl(a, s) > Hl(a, l) ? "to" : "from"
        const eventPos = this.canvas.posFromEvt(e)
        const fromPos = BBoxHelper.getCenterOfBBoxSide(this.from.node.getBBox(), this.from.side)
        const toPos = BBoxHelper.getCenterOfBBoxSide(this.to.node.getBBox(), this.to.side)
        const draggingSide = Math.hypot(eventPos.x - fromPos.x, eventPos.y - fromPos.y) > Math.hypot(eventPos.x - toPos.x, eventPos.y - toPos.y) ? "to" : "from"

        that.plugin.app.workspace.trigger('advanced-canvas:edge-connection-dragging:before', this.canvas, this, e, false, draggingSide, previousEnds)
        activeDocument.addEventListener('pointerup', (e: PointerEvent) => {
          that.plugin.app.workspace.trigger('advanced-canvas:edge-connection-dragging:after', this.canvas, this, e, false, draggingSide, previousEnds)
        }, { once: true })

        return result
      }),
    })

    this.runAfterInitialized(edge, () => {
      this.plugin.app.workspace.trigger('advanced-canvas:edge-added', edge.canvas, edge)
      // this.plugin.app.workspace.trigger(CanvasEvent.EdgeChanged, edge.canvas, edge) - already fired in render function
    })
  }

  private runAfterInitialized(canvasElement: CanvasElement, onReady: () => void) {
    if (canvasElement.initialized) {
      onReady()
      return
    }

    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    // Patch CanvasElement object
    const uninstall = around(canvasElement, {
      initialize: (next: CanvasElement["initialize"]) => function (this: CanvasElement, ...args: Parameters<CanvasElement["initialize"]>): void {
        const result = invoke(next, this, ...args)

        onReady()
        uninstall() // Uninstall the patch

        return result
      }
    })

    that.plugin.register(uninstall)
  }
}
