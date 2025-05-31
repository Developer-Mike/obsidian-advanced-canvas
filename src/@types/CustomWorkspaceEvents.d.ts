import { Menu } from "obsidian"
import { BBox, Canvas, CanvasEdge, CanvasEdgeEnd, CanvasElement, CanvasNode, CanvasView, Position, SelectionData } from "./Canvas"
import { CanvasData } from "./AdvancedJsonCanvas"

export interface EventRef {
  fn: (...args: any) => any
}

export interface CustomWorkspaceEvents {
  // Plugin events
  'advanced-canvas:settings-changed': () => void

  // Built-in canvas events
  'canvas:selection-menu': (menu: Menu, canvas: Canvas) => void
  'canvas:node-menu': (menu: Menu, node: CanvasNode) => void
  'canvas:edge-menu': (menu: Menu, canvas: Canvas) => void
  'canvas:node-connection-drop-menu': (menu: Menu, canvas: Canvas) => void

  // Custom canvas events
  /** Fired when a new canvas gets loaded */
  'advanced-canvas:canvas-changed': (canvas: Canvas) => void
  /** Fired before the canvas view gets unloaded */
  'advanced-canvas:canvas-view-unloaded:before': (view: CanvasView) => void
  /** Fired when the canvas' metadata gets changed */
  'advanced-canvas:canvas-metadata-changed': (canvas: Canvas) => void
  /** Fired before the viewport gets changed */
  'advanced-canvas:viewport-changed:before': (canvas: Canvas) => void
  /** Fired after the viewport gets changed */
  'advanced-canvas:viewport-changed:after': (canvas: Canvas) => void
  /** Fired when a node gets moved */
  'advanced-canvas:node-moved': (canvas: Canvas, node: CanvasNode, usingKeyboard: boolean) => void
  /** Fired when a node gets resized */
  'advanced-canvas:node-resized': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when the canvas gets double-clicked */
  'advanced-canvas:double-click': (canvas: Canvas, event: MouseEvent, preventDefault: { value: boolean }) => void
  /** Fired when the dragging state of the canvas changes */
  'advanced-canvas:dragging-state-changed': (canvas: Canvas, isDragging: boolean) => void
  /** Fired when a new node gets created */
  'advanced-canvas:node-created': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when a new edge gets created */
  'advanced-canvas:edge-created': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when a new node gets added */
  'advanced-canvas:node-added': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when a new edge gets added */
  'advanced-canvas:edge-added': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when any node gets changed */
  'advanced-canvas:node-changed': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when any edge gets changed */
  'advanced-canvas:edge-changed': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when the text content of a node gets changed (While typing) */
  'advanced-canvas:node-text-content-changed': (canvas: Canvas, node: CanvasNode, viewUpdate: any) => void
  /** Fired before an existing edge tries to get dragged */
  'advanced-canvas:edge-connection-try-dragging:before': (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, cancelRef: { value: boolean }) => void
  /** Fired before an edge gets dragged */
  'advanced-canvas:edge-connection-dragging:before': (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to', previousEnds?: { from: CanvasEdgeEnd, to: CanvasEdgeEnd }) => void
  /** Fired after an edge gets dragged */
  'advanced-canvas:edge-connection-dragging:after': (canvas: Canvas, edge: CanvasEdge, event: PointerEvent, newEdge: boolean, side: 'from' | 'to', previousEnds?: { from: CanvasEdgeEnd, to: CanvasEdgeEnd }) => void
  /** Fired when a node gets deleted */
  'advanced-canvas:node-removed': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when an edge gets deleted */
  'advanced-canvas:edge-removed': (canvas: Canvas, edge: CanvasEdge) => void
  /** Fired when a selection of the canvas gets copied */
  'advanced-canvas:copy': (canvas: Canvas, selectionData: SelectionData) => void
  /** Fired when the editing state of a node changes */
  'advanced-canvas:node-editing-state-changed': (canvas: Canvas, node: CanvasNode, isEditing: boolean) => void
  /** Fired when the breakpoint of a node changes (decides if the node's content should be loaded) */
  'advanced-canvas:node-breakpoint-changed': (canvas: Canvas, node: CanvasNode, shouldBeLoaded: { value: boolean }) => void
  /** Fired when the bounding box of a node gets requested (e.g. for the edge path or when dragging a group) */
  'advanced-canvas:node-bbox-requested': (canvas: Canvas, node: CanvasNode, bbox: BBox) => void
  /** Fired when the center of an edge gets requested (e.g. for the edge label position) */
  'advanced-canvas:edge-center-requested': (canvas: Canvas, edge: CanvasEdge, position: Position) => void
  /** Fired when the nodes inside a bounding box get requested */
  'advanced-canvas:containing-nodes-requested': (canvas: Canvas, bbox: BBox, nodes: CanvasNode[]) => void
  /** Fired when the selection of the canvas changes */
  'advanced-canvas:selection-changed': (canvas: Canvas, oldSelection: Set<CanvasElement>, updateSelection: (update: () => void) => void) => void
  /** Fired before the canvas gets zoomed to a bounding box (e.g. zoom to selection, zoom to fit all) */
  'advanced-canvas:zoom-to-bbox:before': (canvas: Canvas, bbox: BBox) => void
  /** Fired after the canvas gets zoomed to a bounding box (e.g. zoom to selection, zoom to fit all) */
  'advanced-canvas:zoom-to-bbox:after': (canvas: Canvas, bbox: BBox) => void
  /** Fired when the a node popup menu gets created (Not firing multiple times if it gets moved between nodes of the same type) */
  'advanced-canvas:popup-menu-created': (canvas: Canvas) => void
  /** Fired when a node gets hovered over */
  'advanced-canvas:node-interaction': (canvas: Canvas, node: CanvasNode) => void
  /** Fired when undo gets called */
  'advanced-canvas:undo': (canvas: Canvas) => void
  /** Fired when redo gets called */
  'advanced-canvas:redo': (canvas: Canvas) => void
  /** Fired when the readonly state of the canvas changes */
  'advanced-canvas:readonly-changed': (canvas: Canvas, readonly: boolean) => void
  /** Fired when the canvas data gets requested */
  'advanced-canvas:data-requested': (canvas: Canvas, data: CanvasData) => void
  /** Fired before the canvas data gets set */
  'advanced-canvas:data-loaded:before': (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => void
  /** Fired after the canvas data gets set */
  'advanced-canvas:data-loaded:after': (canvas: Canvas, data: CanvasData, setData: (data: CanvasData) => void) => void
  /** Fired before the canvas gets saved */
  'advanced-canvas:canvas-saved:before': (canvas: Canvas) => void
  /** Fired after the canvas gets saved */
  'advanced-canvas:canvas-saved:after': (canvas: Canvas) => void
}