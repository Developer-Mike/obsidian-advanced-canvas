import { Canvas, Position, Side } from "src/@types/Canvas"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import SvgPathHelper from "src/utils/svg-path-helper"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  async getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, fromBBoxSidePos: Position, fromSide: Side, toPos: Position, toBBoxSidePos: Position, toSide: Side, _isDragging: boolean): Promise<EdgePath> {
    let pathArray: Position[] = []
    let center: Position = { x: 0, y: 0 }

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

      center = { 
        x: (pathArray[1].x + pathArray[2].x) / 2,
        y: (pathArray[1].y + pathArray[2].y) / 2
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
      
      center = { 
        x: (fromBBoxSidePos.x + toBBoxSidePos.x) / 2, 
        y: (fromBBoxSidePos.y + toBBoxSidePos.y) / 2 
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

      center = { 
        x: pathArray[1].x,
        y: pathArray[1].y
      }
    }

    return {
      svgPath: SvgPathHelper.pathArrayToSvgPath(pathArray, false),
      center: center,
      rotateArrows: false
    }
  }
}