export interface Canvas {
  data: CanvasData
  nodes: Map<string, CanvasNode>
  menu: PopupMenu
  selection: Set<CanvasNode>

  wrapperEl: HTMLElement
  cardMenuEl: HTMLElement

  canvasRect: DOMRect
  tx: number
  ty: number
  tZoom: number

  getData(): CanvasData

  getEdgesForNode(node: CanvasNode): CanvasEdge[]
  createGroupNode(options: any): CanvasNode

  getViewportBBox(): BBox
  setViewport(tx: number, ty: number, tZoom: number): void
  zoomToBbox(bbox: BBox): void
  setReadonly(readonly: boolean): void

  requestPushHistory(data: CanvasData): void
  requestSave(): void
}

export interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export interface CanvasNode {
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

export interface PopupMenu {
  menuEl: HTMLElement
}

export interface BBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}