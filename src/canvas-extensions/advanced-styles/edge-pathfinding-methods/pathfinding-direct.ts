import { Canvas, Position, Side } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"

export default class EdgePathfindingDirect extends EdgePathfindingMethod {
  getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, _fromBBoxSidePos: Position, _fromSide: Side, toPos: Position, _toBBoxSidePos: Position, _toSide: Side): EdgePath {
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