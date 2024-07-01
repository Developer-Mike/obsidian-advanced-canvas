import { Canvas, Position, Side } from "src/@types/Canvas"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import SvgPathHelper from "src/utils/svg-path-helper"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, fromSide: Side, toPos: Position, toSide: Side, _isDragging: boolean): EdgePath {
    let pathArray: Position[] = []

    if (fromSide === toSide) {
      // Same side -> Make a U
      const direction = BBoxHelper.direction(fromSide)

      if (BBoxHelper.isHorizontal(fromSide)) {
        pathArray = [
          fromPos,
          { x: Math.max(fromPos.x, toPos.x) + direction * CanvasHelper.GRID_SIZE, y: fromPos.y },
          { x: Math.max(fromPos.x, toPos.x) + direction * CanvasHelper.GRID_SIZE, y: toPos.y },
          toPos
        ]
      } else {
        pathArray = [
          fromPos,
          { x: fromPos.x, y: Math.max(fromPos.y, toPos.y) + direction * CanvasHelper.GRID_SIZE },
          { x: toPos.x, y: Math.max(fromPos.y, toPos.y) + direction * CanvasHelper.GRID_SIZE },
          toPos
        ]
      }
    } else if (BBoxHelper.isHorizontal(fromSide) === BBoxHelper.isHorizontal(toSide)) {
      // Same axis, different side -> Make a Z
      if (BBoxHelper.isHorizontal(fromSide)) {
        pathArray = [
          fromPos,
          { x: fromPos.x + (toPos.x - fromPos.x) / 2, y: fromPos.y },
          { x: fromPos.x + (toPos.x - fromPos.x) / 2, y: toPos.y },
          toPos
        ]
      } else {
        pathArray = [
          fromPos,
          { x: fromPos.x, y: fromPos.y + (toPos.y - fromPos.y) / 2 },
          { x: toPos.x, y: fromPos.y + (toPos.y - fromPos.y) / 2 },
          toPos
        ]
      }
    } else {
      // Different axis -> Make a L
      if (BBoxHelper.isHorizontal(fromSide)) {
        pathArray = [
          fromPos,
          { x: toPos.x, y: fromPos.y },
          toPos
        ]
      } else {
        pathArray = [
          fromPos,
          { x: fromPos.x, y: toPos.y },
          toPos
        ]
      }
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