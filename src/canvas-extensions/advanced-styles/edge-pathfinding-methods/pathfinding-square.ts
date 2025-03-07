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

    const svgPath = plugin.settings.getSetting('edgeStyleSquarePathRounded')
      ? SvgPathHelper.pathArrayToRoundedSvgPath(pathArray, ROUNDED_EDGE_RADIUS)
      : SvgPathHelper.pathArrayToSvgPath(pathArray)

    return { svgPath, center, rotateArrows: false }
  }
}