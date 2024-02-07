export interface Canvas {
  data: CanvasData
  nodes: Map<string, CanvasNode>
  menu: PopupMenu
  selection: Set<CanvasNode>
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

  getData(): CanvasData

  getEdgesForNode(node: CanvasNode): CanvasEdge[]
  createGroupNode(options: GroupNodeOptions): CanvasNode
  dragTempNode(dragEvent: any, nodeSize: Size, onDropped: (position: Position) => void): void
  deselectAll(): void

  setViewport(tx: number, ty: number, tZoom: number): void
  markViewportChanged(): void

  getViewportBBox(): BBox
  zoomToBbox(bbox: BBox): void

  undo(): void
  redo(): void
  handlePaste(): void
  requestPushHistory(data: CanvasData): void
  requestSave(): void

  // Custom
  lockedX: number
  lockedY: number
  lockedZoom: number
  setNodeUnknownData(node: CanvasNode, key: string, value: any): void
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

export interface GroupNodeOptions {
  pos: Position
  size: Size
  label?: string
  save?: boolean
  focus?: boolean
}

export interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export interface CanvasNode {
  canvas: Canvas
  nodeEl: HTMLElement
  bbox: BBox
  unknownData: CanvasNodeUnknownData
}

export interface CanvasNodeUnknownData {
  type: CanvasNodeType
  shape: string
  isStartNode: boolean

  [key: string]: any
}

export type CanvasNodeType = 'text' | 'group' | 'file'

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