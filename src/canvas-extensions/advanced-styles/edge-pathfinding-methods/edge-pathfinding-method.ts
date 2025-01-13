import { Canvas, Position, Side } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"

export default abstract class EdgePathfindingMethod {
  abstract getPath(plugin: AdvancedCanvasPlugin, canvas: Canvas, fromPos: Position, fromBBoxSidePos: Position, fromSide: Side, toPos: Position, toBBoxSidePos: Position, toSide: Side, isDragging: boolean): Promise<EdgePath | null>
}

export interface EdgePath {
  svgPath: string
  center: Position
  rotateArrows: boolean
}