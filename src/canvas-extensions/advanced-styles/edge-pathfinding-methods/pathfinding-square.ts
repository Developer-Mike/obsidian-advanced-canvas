import { Canvas, Position, Side } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"

const ROUNDED_EDGE_RADIUS = 5

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, fromBBoxSidePos: Position, fromSide: Side, toPos: Position, toBBoxSidePos: Position, toSide: Side): EdgePath {
    let pathArray: Position[]
    let center: Position
    const isFromHorizontal = BBoxHelper.isHorizontal(fromSide)
    const isToHorizontal = BBoxHelper.isHorizontal(toSide)
  
    if (fromSide === toSide) {
      const direction = BBoxHelper.direction(fromSide)

      if (isFromHorizontal) {
        const x = Math.max(fromBBoxSidePos.x, toBBoxSidePos.x) + direction * CanvasHelper.GRID_SIZE
        pathArray = [
          fromPos,
          { x: x, y: fromBBoxSidePos.y },
          { x: x, y: toBBoxSidePos.y },
          toPos
        ]
      } else {
        const y = Math.max(fromBBoxSidePos.y, toBBoxSidePos.y) + direction * CanvasHelper.GRID_SIZE
        pathArray = [
          fromPos,
          { x: fromBBoxSidePos.x, y: y },
          { x: toBBoxSidePos.x, y: y },
          toPos
        ]
      }
      
      center = {
        x: (pathArray[1].x + pathArray[2].x) / 2,
        y: (pathArray[1].y + pathArray[2].y) / 2
      }
    } else if (isFromHorizontal === isToHorizontal) {
      // Z shape: same axis, different sides
      if (isFromHorizontal) {
        const midX = fromBBoxSidePos.x + (toBBoxSidePos.x - fromBBoxSidePos.x) / 2
        pathArray = [
          fromPos,
          { x: midX, y: fromBBoxSidePos.y },
          { x: midX, y: toBBoxSidePos.y },
          toPos
        ]
      } else {
        const midY = fromBBoxSidePos.y + (toBBoxSidePos.y - fromBBoxSidePos.y) / 2
        pathArray = [
          fromPos,
          { x: fromBBoxSidePos.x, y: midY },
          { x: toBBoxSidePos.x, y: midY },
          toPos
        ]
      }

      center = {
        x: (fromBBoxSidePos.x + toBBoxSidePos.x) / 2,
        y: (fromBBoxSidePos.y + toBBoxSidePos.y) / 2
      }
    } else {
      // L shape: different axis
      if (isFromHorizontal) {
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

      center = { x: pathArray[1].x, y: pathArray[1].y }
    }
  
    const svgPath = plugin.settings.getSetting('edgeStyleSquarePathRounded')
      ? SvgPathHelper.pathArrayToRoundedSvgPath(pathArray, ROUNDED_EDGE_RADIUS)
      : SvgPathHelper.pathArrayToSvgPath(pathArray)
  
    return { svgPath, center, rotateArrows: false }
  }
}