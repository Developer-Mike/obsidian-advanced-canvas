export * from "assets/formats/advanced-json-canvas/spec/1.0-1.0"

import {
  CanvasData as OriginalCanvasData,
  AnyCanvasNodeData as OriginalAnyCanvasNodeData,
  CanvasNodeData as OriginalCanvasNodeData,
  CanvasGroupNodeData as OriginalCanvasGroupNodeData,
  CanvasFileNodeData as OriginalCanvasFileNodeData,
  CanvasEdgeData,
  Side
} from "assets/formats/advanced-json-canvas/spec/1.0-1.0"
import { CanvasElementsData } from "./Canvas"

export type AnyCanvasNodeData = OriginalCanvasNodeData | CanvasGroupNodeData | CanvasFileNodeData | OriginalAnyCanvasNodeData
export interface CanvasData extends OriginalCanvasData {
  nodes: AnyCanvasNodeData[]
  edges: CanvasEdgeData[]
}

export interface CanvasNodeData extends OriginalCanvasNodeData {
  // Intermediate values that are not saved in the canvas
  collapsedEdgeData?: Record<Side, CanvasElementsData>
}

export interface CanvasGroupNodeData extends OriginalCanvasGroupNodeData {
  // Intermediate values that are not saved in the canvas
  collapsedData?: CanvasElementsData
}

export interface CanvasFileNodeData extends OriginalCanvasFileNodeData {
  // Intermediate values that are not saved in the canvas
  isPortalLoaded?: boolean
}
