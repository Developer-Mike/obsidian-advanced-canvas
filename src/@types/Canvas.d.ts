import { ItemView, TFile, View, WorkspaceLeaf } from "obsidian"

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

export interface Canvas {
  view: CanvasView
  config: CanvasConfig
  options: CanvasOptions

  getData(): CanvasData
  setData(data: CanvasData): void

  /** Basically setData, but without modifying the history */
  importData(data: CanvasData): void

  nodes: Map<string, CanvasNode>
  edges: Map<string, CanvasEdge>
  getEdgesForNode(node: CanvasNode): CanvasEdge[]

  wrapperEl: HTMLElement
  menu: PopupMenu
  cardMenuEl: HTMLElement
  canvasControlsEl: HTMLElement
  quickSettingsButton: HTMLElement
  nodeInteractionLayer: NodeInteractionLayer

  canvasRect: DOMRect
  getViewportBBox(): BBox
  setViewport(tx: number, ty: number, tZoom: number): void
  markViewportChanged(): void

  x: number
  y: number
  zoom: number

  tx: number
  ty: number
  tZoom: number

  isDragging: boolean
  setDragging(dragging: boolean): void
  
  zoomToBbox(bbox: BBox): void
  zoomToSelection(): void

  readonly: boolean
  setReadonly(readonly: boolean): void

  selection: Set<CanvasElement>
  getSelectionData(): SelectionData
  deselectAll(): void

  toggleObjectSnapping(enabled: boolean): void
  dragTempNode(dragEvent: any, nodeSize: Size, onDropped: (position: Position) => void): void

  createTextNode(options: TextNodeOptions): CanvasNode
  createGroupNode(options: GroupNodeOptions): CanvasNode
  createFileNode(options: FileNodeOptions): CanvasNode

  addNode(node: CanvasNode): void
  removeNode(node: CanvasNode): void
  addEdge(edge: CanvasEdge): void
  removeEdge(edge: CanvasEdge): void

  history: CanvasHistory
  undo(): void
  redo(): void

  handlePaste(): void
  requestSave(): void

  // Custom
  lockedX: number
  lockedY: number
  lockedZoom: number
  setNodeData(node: CanvasNode, key: keyof CanvasNodeData, value: any): void
  setEdgeData(edge: CanvasEdge, key: keyof CanvasEdgeData, value: any): void
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
  undo: () => CanvasData|null
  canRedo: () => boolean
  redo: () => CanvasData|null
}

export interface SelectionData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
  center: Position
}

export interface CanvasConfig {
  defaultTextNodeDimensions: Size
}

export interface CanvasView extends ItemView {
  _loaded: boolean
  file: TFile
  canvas: Canvas
  leaf: CanvasWorkspaceLeaf

  getViewData(): string
  setViewData(data: string): void
}

export interface CanvasWorkspaceLeaf extends WorkspaceLeaf {
  id: string
}

export interface NodeOptions {
  pos: Position
  size: Size
  save?: boolean
  focus?: boolean
}

export interface TextNodeOptions extends NodeOptions {
  text?: string
}

export interface GroupNodeOptions extends NodeOptions {
  label?: string
}

export interface FileNodeOptions extends NodeOptions {
  file: TFile
  subpath?: string
}

export interface CanvasData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
}

export interface CanvasElement {
  canvas: Canvas
  initialized: boolean

  initialize(): void
  setColor(color: string): void
}

export type CanvasNodeType = 'text' | 'group' | 'file' | 'link'
export interface CanvasNodeData {
  type: CanvasNodeType
  text?: string
  label?: string
  file?: string

  isSticker?: boolean
  shape?: string

  isStartNode?: boolean
  edgesToNodeFromPortal?: { [key: string]: CanvasEdgeData[] }

  // Portal node
  portalToFile?: string
  closedPortalWidth?: number
  closedPortalHeight?: number
  portalIdMaps?: { 
    nodeIdMap: { [key: string]: string }
    edgeIdMap: { [key: string]: string }
  }

  // Node from portal
  portalId?: string

  [key: string]: any
}

export interface CanvasNode extends CanvasElement {
  nodeEl: HTMLElement
  getBBox(): BBox

  labelEl?: HTMLElement
  file?: TFile

  x: number
  y: number
  width: number
  height: number

  /** Move node to the front. */
  zIndex: number
  updateZIndex(): void

  color: string

  setData(data: CanvasNodeData): void
  getData(): CanvasNodeData
}

type Side = 'top' | 'right' | 'bottom' | 'left'
export interface CanvasEdgeData {
  id: string

  fromNode: string
  toNode: string

  fromSide: Side
  toSide: Side
  
  edgeStyle?: 'long-dashed' | 'short-dashed' | 'dotted'
  edgePathRoute?: 'direct' | 'a-star'

  portalId?: string
  isUnsaved?: boolean
}

type EndType = 'none' | 'arrow'
export interface CanvasEdge extends CanvasElement {
  label: string

  from: {
    node: CanvasNode
    side: Side
    end: EndType
  }
  to: {
    node: CanvasNode
    side: Side
    end: EndType
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

  /** Custom field */
  center?: Position
  getCenter(): Position
  render(): void
  updatePath(): void
  
  setData(data: CanvasEdgeData): void
  getData(): CanvasEdgeData
}

export interface NodeInteractionLayer {
  interactionEl: HTMLElement
  setTarget(node: CanvasNode): void
}

export interface PopupMenu {
  menuEl: HTMLElement
  render(): void
}