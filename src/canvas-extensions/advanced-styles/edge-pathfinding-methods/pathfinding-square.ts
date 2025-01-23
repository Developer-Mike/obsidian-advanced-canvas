import { Canvas, Position, Side } from "src/@types/Canvas"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import SvgPathHelper from "src/utils/svg-path-helper"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(_plugin: AdvancedCanvasPlugin, _canvas: Canvas, fromPos: Position, fromBBoxSidePos: Position, fromSide: Side, toPos: Position, toBBoxSidePos: Position, toSide: Side): EdgePath {
    let pathArray: Position[] = []
    let center: Position = { x: 0, y: 0 }

    if (fromSide === toSide) { // Same side -> Make a U
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
    } else if (BBoxHelper.isHorizontal(fromSide) === BBoxHelper.isHorizontal(toSide)) { // Same axis, different side -> Make a Z
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
    } else { // Different axis -> L-shape or 5-point detour
      if (BBoxHelper.isHorizontal(fromSide)) {
        // Horizontal (left/right) to Vertical (top/bottom)
        const isLeft = fromSide === 'left'
        const needsDetour = isLeft 
          ? toBBoxSidePos.x < fromBBoxSidePos.x // Left-side facing left
          : toBBoxSidePos.x > fromBBoxSidePos.x // Right-side facing right
    
        if (needsDetour) {
          const grid = CanvasHelper.GRID_SIZE
          const toDir = BBoxHelper.direction(toSide) // -1 for top, 1 for bottom
          const detourX = fromBBoxSidePos.x + (isLeft ? -grid : grid)
          const detourY = toBBoxSidePos.y + toDir * grid
    
          pathArray = [
            fromPos,
            { x: detourX, y: fromBBoxSidePos.y }, // Escape perpendicular
            { x: detourX, y: detourY },           // Align vertically
            { x: toBBoxSidePos.x, y: detourY },   // Approach horizontally
            toPos
          ]
          center = {
            x: detourX,
            y: (fromBBoxSidePos.y + detourY) / 2
          }
        } else {
          // Straight L-shape
          pathArray = [
            fromPos,
            { x: toBBoxSidePos.x, y: fromBBoxSidePos.y },
            toPos
          ]
          center = { x: pathArray[1].x, y: pathArray[1].y }
        }
      } else { // Different axis -> L-shape or 5-point detour
        if (BBoxHelper.isHorizontal(fromSide)) {
          // Horizontal (left/right) to Vertical (top/bottom)
          const isLeft = fromSide === 'left'
          const needsDetour = isLeft 
            ? toBBoxSidePos.x > fromBBoxSidePos.x  // Left-side: detour if target is to the right
            : toBBoxSidePos.x < fromBBoxSidePos.x // Right-side: detour if target is to the left
      
          if (needsDetour) {
            const grid = CanvasHelper.GRID_SIZE
            const toDir = BBoxHelper.direction(toSide) // -1 for top, 1 for bottom
            const detourX = fromBBoxSidePos.x + (isLeft ? -grid : grid)
            const detourY = toBBoxSidePos.y + toDir * grid
      
            pathArray = [
              fromPos,
              { x: detourX, y: fromBBoxSidePos.y }, // Step 1: Move perpendicular to fromSide
              { x: detourX, y: detourY },           // Step 2: Align vertically
              { x: toBBoxSidePos.x, y: detourY },   // Step 3: Move horizontally to target
              toPos
            ]
            center = { 
              x: detourX,
              y: (fromBBoxSidePos.y + detourY) / 2
            }
          } else {
            // Straight L-shape
            pathArray = [
              fromPos,
              { x: toBBoxSidePos.x, y: fromBBoxSidePos.y },
              toPos
            ]
            center = { x: pathArray[1].x, y: pathArray[1].y }
          }
        } else {
          // Vertical (top/bottom) to Horizontal (left/right)
          const isTop = fromSide === 'top'
          const needsDetour = isTop 
            ? toBBoxSidePos.y > fromBBoxSidePos.y  // Top-side: detour if target is below
            : toBBoxSidePos.y < fromBBoxSidePos.y // Bottom-side: detour if target is above
      
          if (needsDetour) {
            const grid = CanvasHelper.GRID_SIZE
            const toDir = BBoxHelper.direction(toSide) // -1 for left, 1 for right
            const detourY = fromBBoxSidePos.y + (isTop ? -grid : grid)
            const detourX = toBBoxSidePos.x + toDir * grid
      
            pathArray = [
              fromPos,
              { x: fromBBoxSidePos.x, y: detourY }, // Step 1: Move perpendicular to fromSide
              { x: detourX, y: detourY },           // Step 2: Align horizontally
              { x: detourX, y: toBBoxSidePos.y },   // Step 3: Move vertically to target
              toPos
            ]
            center = {
              x: (fromBBoxSidePos.x + detourX) / 2,
              y: detourY
            }
          } else {
            // Straight L-shape
            pathArray = [
              fromPos,
              { x: fromBBoxSidePos.x, y: toBBoxSidePos.y },
              toPos
            ]
            center = { x: pathArray[1].x, y: pathArray[1].y }
          }
        }
      }
    }

    return {
      svgPath: SvgPathHelper.pathArrayToSvgPath(pathArray, false),
      center: center,
      rotateArrows: false
    }
  }
}