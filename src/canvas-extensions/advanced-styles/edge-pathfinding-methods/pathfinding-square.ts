import { Canvas, Position, Side } from "src/@types/Canvas"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import SvgPathHelper from "src/utils/svg-path-helper"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, fromBBoxSidePos: Position, fromSide: Side, toPos: Position, toBBoxSidePos: Position, toSide: Side, _isDragging: boolean): EdgePath {
    let pathArray: Position[] = []

    if (fromSide === toSide) {
      // Same side -> Make a U
      const direction = BBoxHelper.direction(fromSide)

      if (BBoxHelper.isHorizontal(fromSide)) {
        pathArray = [
          fromPos,
          { x: Math.max(fromBBoxSidePos.x, toBBoxSidePos.x) + direction * CanvasHelper.GRID_SIZE, y: fromBBoxSidePos.y },
          { x: Math.max(fromBBoxSidePos.x, toBBoxSidePos.x) + direction * CanvasHelper.GRID_SIZE, y: toBBoxSidePos.y },
          toPos
        ]
      } else {
        pathArray = [
          fromPos,
          { x: fromBBoxSidePos.x, y: Math.max(fromBBoxSidePos.y, toBBoxSidePos.y) + direction * CanvasHelper.GRID_SIZE },
          { x: toBBoxSidePos.x, y: Math.max(fromBBoxSidePos.y, toBBoxSidePos.y) + direction * CanvasHelper.GRID_SIZE },
          toPos
        ]
      }
    } else if (BBoxHelper.isHorizontal(fromSide) === BBoxHelper.isHorizontal(toSide)) {
      // Same axis, different side -> Make a Z
      if (BBoxHelper.isHorizontal(fromSide)) {
        pathArray = [
          fromPos,
          { x: fromBBoxSidePos.x + (toBBoxSidePos.x - fromBBoxSidePos.x) / 2, y: fromBBoxSidePos.y },
          { x: fromBBoxSidePos.x + (toBBoxSidePos.x - fromBBoxSidePos.x) / 2, y: toBBoxSidePos.y },
          toPos
        ]
      } else {
        pathArray = [
          fromPos,
          { x: fromBBoxSidePos.x, y: fromBBoxSidePos.y + (toBBoxSidePos.y - fromBBoxSidePos.y) / 2 },
          { x: toBBoxSidePos.x, y: fromBBoxSidePos.y + (toBBoxSidePos.y - fromBBoxSidePos.y) / 2 },
          toPos
        ]
      }
    } else {
      // Different axis -> Make a L
      if (BBoxHelper.isHorizontal(fromSide)) {
        pathArray = [
          fromPos,
          { x: toBBoxSidePos.x, y: fromBBoxSidePos.y },
          toPos
        ]
      } else {
        pathArray = [
          fromPos,
          { x: fromBBoxSidePos.x, y: toBBoxSidePos.y },
          toPos
        ]
      }
    }

    return {
      svgPath: SvgPathHelper.pathArrayToSvgPath(pathArray, false),
      center: { 
        x: (fromBBoxSidePos.x + toBBoxSidePos.x) / 2, 
        y: (fromBBoxSidePos.y + toBBoxSidePos.y) / 2 
      },
      rotateArrows: false
    }
  }
}