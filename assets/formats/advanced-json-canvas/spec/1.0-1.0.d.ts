export type CanvasColor = `${number}` | `#${string}`

export interface CanvasData {
  metadata: CanvasMetadata
  nodes: AnyCanvasNodeData[]
  edges: CanvasEdgeData[]
}

export interface CanvasMetadata {
  version: '1.0-1.0'
  frontmatter: { [key: string]: unknown }
  startNode?: string
}

export type CanvasNodeType = 'text' | 'group' | 'file' | 'link'
export interface CanvasNodeData {
  id: string
  type: CanvasNodeType

  x: number
  y: number
  width: number
  height: number
  dynamicHeight?: boolean // AdvancedJsonCanvas
  ratio?: number

  color?: CanvasColor

  styleAttributes?: { [key: string]: string | null } // AdvancedJsonCanvas
}

export type AnyCanvasNodeData = CanvasNodeData | CanvasTextNodeData | CanvasFileNodeData | CanvasLinkNodeData | CanvasGroupNodeData

export interface CanvasTextNodeData extends CanvasNodeData {
  type: 'text'
  text: string
}

export type Subpath = `#${string}`
export interface CanvasFileNodeData extends CanvasNodeData {
  type: 'file'
  file: string
  subpath?: Subpath

  portal?: boolean // AdvancedJsonCanvas
  interdimensionalEdges?: CanvasEdgeData[] // AdvancedJsonCanvas
}

export interface CanvasLinkNodeData extends CanvasNodeData {
  type: 'link'
  url: string
}

export type BackgroundStyle = 'cover' | 'ratio' | 'repeat'
export interface CanvasGroupNodeData extends CanvasNodeData {
  type: 'group'
  label?: string
  background?: string
  backgroundStyle?: BackgroundStyle

  collapsed?: boolean // AdvancedJsonCanvas
}

type Side = 'top' | 'right' | 'bottom' | 'left'
type EndType = 'none' | 'arrow'
export interface CanvasEdgeData {
  id: string

  fromNode: string
  fromSide: Side
  fromFloating?: boolean // AdvancedJsonCanvas
  fromEnd?: EndType
  
  toNode: string
  toSide: Side
  toFloating?: boolean // AdvancedJsonCanvas
  toEnd?: EndType

  color?: CanvasColor
  label?: string

  styleAttributes?: { [key: string]: string | null } // AdvancedJsonCanvas
}