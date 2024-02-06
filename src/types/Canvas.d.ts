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

  undo(): void
  redo(): void
  handlePaste(): void
  requestPushHistory(data: CanvasData): void
  requestSave(): void

  setNodeUnknownData(node: CanvasNode, key: string, value: any): void
}

export interface BBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
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