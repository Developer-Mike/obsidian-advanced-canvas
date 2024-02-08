import { TFile } from "obsidian"

export interface Canvas {
  view: CanvasView
  config: CanvasConfig

  getData(): CanvasData

  nodes: Map<string, CanvasNode>
  menu: PopupMenu
  nodeInteractionLayer: NodeInteractionLayer

  wrapperEl: HTMLElement
  cardMenuEl: HTMLElement
  canvasControlsEl: HTMLElement
  quickSettingsButton: HTMLElement

  canvasRect: DOMRect
  x: number
  tx: number
  y: number
  ty: number
  zoom: number
  tZoom: number

  readonly: boolean
  setReadonly(readonly: boolean): void

  selection: Set<CanvasNode>
  getSelectionData(): SelectionData
  deselectAll(): void

  getEdgesForNode(node: CanvasNode): CanvasEdge[]

  createTextNode(options: TextNodeOptions): CanvasNode
  createGroupNode(options: GroupNodeOptions): CanvasNode
  createFileNode(options: FileNodeOptions): CanvasNode
  removeNode(node: CanvasNode): void

  dragTempNode(dragEvent: any, nodeSize: Size, onDropped: (position: Position) => void): void

  setViewport(tx: number, ty: number, tZoom: number): void
  markViewportChanged(): void

  getViewportBBox(): BBox
  zoomToBbox(bbox: BBox): void
  zoomToSelection(): void

  undo(): void
  redo(): void

  handlePaste(): void
  requestPushHistory(data: CanvasData): void
  requestSave(): void

  // Custom
  lockedX: number
  lockedY: number
  lockedZoom: number
  setNodeData(node: CanvasNode, key: keyof CanvasNodeData, value: any): void
}

export interface SelectionData {
  nodes: CanvasNodeData[]
  edges: CanvasEdgeData[]
  center: Position
}

export interface CanvasConfig {
  defaultTextNodeDimensions: Size
}

export interface CanvasView {
  file: TFile
}

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

type Side = 'top' | 'right' | 'bottom' | 'left'

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
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export interface CanvasNodeData {
  type: CanvasNodeType
  shape: string
  isStartNode: boolean

  [key: string]: any
}

export interface CanvasNode {
  canvas: Canvas
  nodeEl: HTMLElement
  bbox: BBox
  getBBox(): BBox
  text?: string
  color: string
  setData(data: CanvasNodeData): void
  getData(): CanvasNodeData
}

export interface CanvasNodeUnknownData {
}

export type CanvasNodeType = 'text' | 'group' | 'file'

export interface CanvasEdgeData {
  fromNode: string
  toNode: string

  fromSide: Side
  toSide: Side

  id: string
  label?: string
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

export interface BBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}