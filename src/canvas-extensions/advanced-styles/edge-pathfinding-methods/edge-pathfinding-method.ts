import { Canvas, Position, Side } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"

export default abstract class EdgePathfindingMethod {
  constructor(
    protected plugin: AdvancedCanvasPlugin,
    protected canvas: Canvas,
    protected fromPos: Position,
    protected fromBBoxSidePos: Position,
    protected fromSide: Side,
    protected toPos: Position,
    protected toBBoxSidePos: Position,
    protected toSide: Side
  ) {}

  abstract getPath(): EdgePath | null
}

export interface EdgePath {
  svgPath: string
  center: Position
  rotateArrows: boolean
}