import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { AnyNodeData, CanvasData, CanvasEdgeData, CanvasMetadata, CanvasNodeData, EndType, Side } from "./AdvancedJsonCanvas"

export interface Size {
  width: number
  height: number
}

export interface Position {
  x: number
  y: number
}

export interface BBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface CanvasOptions {
  snapToObjects: boolean
  snapToGrid: boolean
}

export interface CanvasHistory {
  data: CanvasData[]
  current: number
  max: number

  applyHistory: (data: CanvasData) => void
  canUndo: () => boolean
  undo: () => CanvasData | null
  canRedo: () => boolean
  redo: () => CanvasData | null
}

export interface SelectionData extends CanvasData {
  center: Position
}

export interface CanvasConfig {
  defaultTextNodeDimensions: Size
  defaultFileNodeDimensions: Size
  minContainerDimension: number
}

export interface CanvasView extends ItemView {
  _loaded: boolean
  file: TFile
  canvas: Canvas
  leaf: CanvasWorkspaceLeaf

  getViewData(): string
  setViewData(data: string): void

  data: string
  lastSavedData: string
  requestSave(): void
}

export interface CanvasWorkspaceLeaf extends WorkspaceLeaf {
  id: string
  rebuildView(): void
}

export interface CanvasElement {
  canvas: Canvas
  initialized: boolean
  isDirty?: boolean // Custom for Change event

  child: {
    editMode: {
      cm: {
        dom: HTMLElement
      }
    }
  }

  initialize(): void
  setColor(color: string): void

  updateBreakpoint(breakpoint: boolean): void
  setIsEditing(editing: boolean): void
  getBBox(): BBox

  getData(): CanvasNodeData | CanvasEdgeData
  setData(data: CanvasNodeData | CanvasEdgeData): void
}

export interface CanvasNode extends CanvasElement {
  isEditing: boolean

  nodeEl: HTMLElement
  contentEl: HTMLElement
  isContentMounted?: boolean

  labelEl?: HTMLElement
  file?: TFile

  id: string
  x: number
  y: number
  width: number
  height: number

  zIndex: number
  /** Move node to the front. */
  updateZIndex(): void

  color: string

  setData(data: AnyNodeData, addHistory?: boolean): void
  getData(): CanvasNodeData

  onConnectionPointerdown(e: PointerEvent, side: Side): void

  // Custom
  breakpoint?: number | null
  prevX: number
  prevY: number
  prevWidth: number
  prevHeight: number
}

export interface CanvasEdge extends CanvasElement {
  label: string

  from: {
    node: CanvasNode
    side: Side
    end: EndType
  }
  fromLineEnd: {
    el: HTMLElement
    type: 'arrow'
  }

  to: {
    node: CanvasNode
    side: Side
    end: EndType
  }
  toLineEnd: {
    el: HTMLElement
    type: 'arrow'
  }

  bezier: {
    from: Position
    to: Position
    cp1: Position
    cp2: Position
    path: string
  }

  path: {
    interaction: HTMLElement
    display: HTMLElement
  }

  labelElement: {
    edge: CanvasEdge
    initialTextState: string
    isEditing: boolean
    textareaEl: HTMLElement
    wrapperEl: HTMLElement

    render(): void
  }

  lineGroupEl: HTMLElement
  lineEndGroupEl: HTMLElement
  getCenter(): Position
  render(): void
  updatePath(): void
  onConnectionPointerdown(e: PointerEvent): void

  setData(data: CanvasEdgeData, addHistory?: boolean): void
  getData(): CanvasEdgeData

  // Custom
  center?: Position
}

export interface NodeInteractionLayer {
  canvas: Canvas
  interactionEl: HTMLElement
  setTarget(node: CanvasNode): void
}

export interface CanvasPopupMenu {
  canvas: Canvas
  menuEl: HTMLElement
  render(): void
}

export interface Canvas {
  view: CanvasView
  config: CanvasConfig
  options: CanvasOptions

  metadata: CanvasMetadata
  metadataNode: CanvasNode
  setMetadata(key: string, value: any): void

  unload(): void
  /**
   * @deprecated Use getData instead -> Can be outdated
   */
  data: CanvasData
  getData(): CanvasData
  setData(data: CanvasData): void
  /** Basically setData (if clearCanvas == true), but without modifying the history */
  importData(data: CanvasData, clearCanvas?: boolean, /* custom */ silent?: boolean): void
  clear(): void

  nodes: Map<string, CanvasNode>
  edges: Map<string, CanvasEdge>
  getEdgesForNode(node: CanvasNode): CanvasEdge[]

  edgeFrom: {
    data: Map<CanvasNode, Set<CanvasEdge>>
    add: (node: CanvasNode, edge: CanvasEdge) => void
    get: (node: CanvasNode) => Set<CanvasEdge>
  }
  edgeTo: { data: Map<string, CanvasEdge> }

  dirty: Set<CanvasElement>
  markDirty(element: CanvasElement): void
  markMoved(element: CanvasNode): void

  wrapperEl: HTMLElement
  canvasEl: HTMLElement
  menu: CanvasPopupMenu
  cardMenuEl: HTMLElement
  canvasControlsEl: HTMLElement
  quickSettingsButton: HTMLElement
  nodeInteractionLayer: NodeInteractionLayer

  canvasRect: DOMRect
  getViewportBBox(): BBox
  setViewport(tx: number, ty: number, tZoom: number): void

  viewportChanged: boolean
  markViewportChanged(): void

  x: number
  y: number
  zoom: number
  zoomCenter: Position | null
  zoomBreakpoint: number

  tx: number
  ty: number
  tZoom: number
  screenshotting: boolean

  isDragging: boolean
  setDragging(dragging: boolean): void

  pointer: Position

  zoomToFit(): void
  zoomToSelection(): void
  zoomToBbox(bbox: BBox): void

  readonly: boolean
  setReadonly(readonly: boolean): void

  selection: Set<CanvasElement>
  getSelectionData(): SelectionData
  updateSelection(update: () => void): void
  deselectAll(): void

  toggleObjectSnapping(enabled: boolean): void
  dragTempNode(dragEvent: any, nodeSize: Size, onDropped: (position: Position) => void): void

  createTextNode(options: { [key: string]: any }): CanvasNode
  createGroupNode(options: { [key: string]: any }): CanvasNode
  createFileNode(options: { [key: string]: any }): CanvasNode
  createFileNodes(filepaths: string[], position: Position): CanvasNode[]
  createLinkNode(options: { [key: string]: any }): CanvasNode

  addNode(node: CanvasNode): void
  removeNode(node: CanvasNode): void
  addEdge(edge: CanvasEdge): void
  removeEdge(edge: CanvasEdge): void

  getContainingNodes(bbox: BBox): CanvasNode[]
  getViewportNodes(): CanvasNode[]

  history: CanvasHistory
  pushHistory(data: CanvasData): void
  undo(): void
  redo(): void

  posFromEvt(event: MouseEvent): Position
  onDoubleClick(event: MouseEvent): void
  handleCopy(e: ClipboardEvent): void

  handlePaste(): void
  requestSave(): void

  onResize(): void

  // Custom
  zoomToRealBbox(bbox: BBox): void
  isClearing?: boolean
  isCopying?: boolean
  isPasting?: boolean
  lockedX: number
  lockedY: number
  lockedZoom: number
}