import { Canvas, Position, Side } from "src/@types/Canvas"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import SvgPathHelper from "src/utils/svg-path-helper"
import AdvancedCanvasPlugin from "src/main"

export default class EdgePathfindingDirect extends EdgePathfindingMethod {
  async getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, _fromBBoxSidePos: Position, _fromSide: Side, toPos: Position, _toBBoxSidePos: Position, _toSide: Side, _isDragging: boolean): Promise<EdgePath> {
    return {
      svgPath: SvgPathHelper.pathArrayToSvgPath([fromPos, toPos], false),
      center: {
        x: (fromPos.x + toPos.x) / 2,
        y: (fromPos.y + toPos.y) / 2
      },
      rotateArrows: true
    }
  }
}