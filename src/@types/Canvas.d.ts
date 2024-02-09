import { TFile, View } from "obsidian"

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

  getData(): CanvasData
  setData(data: CanvasData): void

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

  zoomToBbox(bbox: BBox): void
  zoomToSelection(): void

  readonly: boolean
  setReadonly(readonly: boolean): void

  selection: Set<CanvasNode>
  getSelectionData(): SelectionData
  deselectAll(): void

  dragTempNode(dragEvent: any, nodeSize: Size, onDropped: (position: Position) => void): void
  createTextNode(options: TextNodeOptions): CanvasNode
  createGroupNode(options: GroupNodeOptions): CanvasNode
  createFileNode(options: FileNodeOptions): CanvasNode
  removeNode(node: CanvasNode): void

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
  foreignCanvasData: { [key: string]: CanvasData }
}

export interface CanvasHistory {
  data: CanvasData[]
  current: number
  max: number
}

export interface SelectionData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
  center: Position
}

export interface CanvasConfig {
  defaultTextNodeDimensions: Size
}

export interface CanvasView extends View {
  file: TFile
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

export type CanvasNodeType = 'text' | 'group' | 'file' | 'link'
export interface CanvasNodeData {
  type: CanvasNodeType
  shape: string
  isStartNode: boolean

  isPortalOpen?: boolean
  closedPortalWidth?: number
  closedPortalHeight?: number
  portalIdMaps?: { 
    nodeIdMap: { [key: string]: string }
    edgeIdMap: { [key: string]: string }
  }

  [key: string]: any
}

export interface CanvasNode {
  canvas: Canvas
  nodeEl: HTMLElement
  getBBox(): BBox

  color: string
  zIndex: number

  /** @deprecated Use `canvas.setNodeData` instead */
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
}

export interface CanvasEdge {
  label: string

  from: {
    node: CanvasNode
  }
  to: {
    node: CanvasNode
  }
}

export interface NodeInteractionLayer {
  interactionEl: HTMLElement
  setTarget(node: CanvasNode): void
}

export interface PopupMenu {
  menuEl: HTMLElement
  render(): void
}