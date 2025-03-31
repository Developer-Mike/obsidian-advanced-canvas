export * from "assets/formats/advanced-json-canvas/spec/1.0-1.0"

import { CanvasData, CanvasNodeData as OriginalCanvasNodeData } from "assets/formats/advanced-json-canvas/spec/1.0-1.0"

export interface CanvasNodeData extends OriginalCanvasNodeData {
  // Intermediate values that are not saved in the canvas
  collapsedData?: CanvasData

  portalId?: string
}