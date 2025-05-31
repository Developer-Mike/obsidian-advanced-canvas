import { App, ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { AnyCanvasNodeData, CanvasData, CanvasEdgeData, CanvasMetadata, CanvasNodeData, EndType, Side } from "./AdvancedJsonCanvas"

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

export interface CanvasElementsData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
}

export interface CanvasHistory {
  data: CanvasElementsData[]
  current: number
  max: number

  applyHistory: (data: CanvasElementsData) => void
  canUndo: () => boolean
  undo: () => CanvasElementsData | null
  canRedo: () => boolean
  redo: () => CanvasElementsData | null
}

export interface SelectionData extends CanvasElementsData {
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

  close(): void

  data: string
  lastSavedData: string
  requestSave(): void
}

export interface CanvasWorkspaceLeaf extends WorkspaceLeaf {
  id: string
  rebuildView(): void
}

export interface CanvasElement {
  id: string
  
  canvas: Canvas
  initialized: boolean
  isDirty?: boolean // Custom for Change event

  child: {
    data: string

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

  x: number
  y: number
  width: number
  height: number

  zIndex: number
  /** Move node to the front. */
  updateZIndex(): void
  renderZIndex(): void

  color: string

  setData(data: AnyCanvasNodeData, addHistory?: boolean): void
  getData(): CanvasNodeData

  onConnectionPointerdown(e: PointerEvent, side: Side): void

  // File node only
  file?: TFile
  setFile(file: TFile, subpath?: string, force?: boolean): void
  setFilePath(filepath: string, subpath: string): void

  // Custom
  collapseEl?: HTMLElement

  breakpoint?: number | null
  prevX: number
  prevY: number
  prevWidth: number
  prevHeight: number

  currentPortalFile?: string
  portalIdMaps?: {
    nodeIdMap: { [key: string]: string }
    edgeIdMap: { [key: string]: string }
  }

  // Custom
  setZIndex(value?: number): void
}

export interface CanvasEdgeEnd {
  node: CanvasNode
  side: Side
  end: EndType
}

export interface CanvasEdge extends CanvasElement {
  label: string

  from: CanvasEdgeEnd
  fromLineEnd: {
    el: HTMLElement
    type: 'arrow'
  }

  to: CanvasEdgeEnd
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
  app: App

  view: CanvasView
  config: CanvasConfig
  options: CanvasOptions

  metadata: CanvasMetadata

  unload(): void
  /**
   * @deprecated Use getData instead -> Can be outdated
   */
  data: CanvasData
  getData(): CanvasData
  setData(data: CanvasData): void
  /** Basically setData (if clearCanvas == true), but without modifying the history */
  importData(data: CanvasElementsData, clearCanvas?: boolean, /* custom */ silent?: boolean): void
  clear(): void

  nodes: Map<string, CanvasNode>
  edges: Map<string, CanvasEdge>
  getEdgesForNode(node: CanvasNode): CanvasEdge[]

  edgeFrom: {
    data: Map<CanvasNode, Set<CanvasEdge>>
    add: (node: CanvasNode, edge: CanvasEdge) => void
    get: (node: CanvasNode) => Set<CanvasEdge> | undefined
  }
  edgeTo: {
    data: Map<CanvasNode, Set<CanvasEdge>>
    add: (node: CanvasNode, edge: CanvasEdge) => void
    get: (node: CanvasNode) => Set<CanvasEdge> | undefined
  }

  dirty: Set<CanvasElement>
  markDirty(element: CanvasElement): void
  markMoved(element: CanvasElement): void

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

  zIndexCounter: number

  pointer: Position

  zoomToFit(): void
  zoomToSelection(): void
  zoomToBbox(bbox: BBox): void

  posFromClient(clientPos: Position): Position

  readonly: boolean
  setReadonly(readonly: boolean): void

  selection: Set<CanvasElement>
  getSelectionData(): SelectionData
  updateSelection(update: () => void): void
  selectOnly(element: CanvasElement): void
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
  pushHistory(data: CanvasElementsData): void
  undo(): void
  redo(): void

  posFromEvt(event: MouseEvent): Position
  onDoubleClick(event: MouseEvent): void
  handleCopy(e: ClipboardEvent): void

  handlePaste(): void
  requestSave(): void

  onResize(): void

  // Custom
  searchEl?: HTMLElement
  zoomToRealBbox(bbox: BBox): void
  isClearing?: boolean
  isCopying?: boolean
  isPasting?: boolean
  lockedX: number
  lockedY: number
  lockedZoom: number
}