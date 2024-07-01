import { Canvas, Position, Side } from "src/@types/Canvas"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import SvgPathHelper from "src/utils/svg-path-helper"
import AdvancedCanvasPlugin from "src/main"

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, fromSide: Side, toPos: Position, _toSide: Side, _isDragging: boolean): EdgePath {
    let pathArray: Position[] = []
    if (fromSide === 'bottom' || fromSide === 'top') {
      pathArray = [
        fromPos, 
        { x: fromPos.x, y: fromPos.y + (toPos.y - fromPos.y) / 2 },
        { x: toPos.x, y: fromPos.y + (toPos.y - fromPos.y) / 2 },
        toPos
      ]
    } else {
      pathArray = [
        fromPos, 
        { x: fromPos.x + (toPos.x - fromPos.x) / 2, y: fromPos.y },
        { x: fromPos.x + (toPos.x - fromPos.x) / 2, y: toPos.y },
        toPos
      ]
    }

    return {
      svgPath: SvgPathHelper.pathArrayToSvgPath(pathArray, false),
      center: { 
        x: (fromPos.x + toPos.x) / 2, 
        y: (fromPos.y + toPos.y) / 2 
      },
      rotateArrows: false
    }
  }
}