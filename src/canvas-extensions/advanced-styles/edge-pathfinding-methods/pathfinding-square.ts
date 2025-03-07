import { Canvas, Position, Side } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"

const ROUNDED_EDGE_RADIUS = 5

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(): EdgePath {
    let pathArray: Position[]
    let center: Position
    const isFromHorizontal = BBoxHelper.isHorizontal(this.fromSide)
    const isToHorizontal = BBoxHelper.isHorizontal(this.toSide)
  
    if (this.fromSide === this.toSide) {
      // U shape: same side
      const direction = BBoxHelper.direction(this.fromSide)

      if (isFromHorizontal) {
        const x = Math.max(this.fromBBoxSidePos.x, this.toBBoxSidePos.x) + direction * CanvasHelper.GRID_SIZE
        pathArray = [
          this.fromPos,
          { x: x, y: this.fromBBoxSidePos.y },
          { x: x, y: this.toBBoxSidePos.y },
          this.toPos
        ]
      } else {
        const y = Math.max(this.fromBBoxSidePos.y, this.toBBoxSidePos.y) + direction * CanvasHelper.GRID_SIZE
        pathArray = [
          this.fromPos,
          { x: this.fromBBoxSidePos.x, y: y },
          { x: this.toBBoxSidePos.x, y: y },
          this.toPos
        ]
      }
      
      center = {
        x: (pathArray[1].x + pathArray[2].x) / 2,
        y: (pathArray[1].y + pathArray[2].y) / 2
      }
    } else if (isFromHorizontal === isToHorizontal) {
      // Z shape: same axis, different sides
      if (isFromHorizontal) {
        const midX = this.fromBBoxSidePos.x + (this.toBBoxSidePos.x - this.fromBBoxSidePos.x) / 2
        pathArray = [
          this.fromPos,
          { x: midX, y: this.fromBBoxSidePos.y },
          { x: midX, y: this.toBBoxSidePos.y },
          this.toPos
        ]
      } else {
        const midY = this.fromBBoxSidePos.y + (this.toBBoxSidePos.y - this.fromBBoxSidePos.y) / 2
        pathArray = [
          this.fromPos,
          { x: this.fromBBoxSidePos.x, y: midY },
          { x: this.toBBoxSidePos.x, y: midY },
          this.toPos
        ]
      }

      center = {
        x: (this.fromBBoxSidePos.x + this.toBBoxSidePos.x) / 2,
        y: (this.fromBBoxSidePos.y + this.toBBoxSidePos.y) / 2
      }
    } else {
      // Different axis -> L-shape or 5-point path
      const idealCenter = isFromHorizontal ? {
        x: this.toBBoxSidePos.x,
        y: this.fromBBoxSidePos.y
      } : {
        x: this.fromBBoxSidePos.x,
        y: this.toBBoxSidePos.y
      }

      const isPathCollidingAtFrom = this.fromSide === "top" && idealCenter.y > this.fromPos.y ||
        this.fromSide === "bottom" && idealCenter.y < this.fromPos.y ||
        this.fromSide === "left" && idealCenter.x > this.fromPos.x ||
        this.fromSide === "right" && idealCenter.x < this.fromPos.x

      const isPathCollidingAtTo = this.toSide === "top" && idealCenter.y > this.toPos.y ||
        this.toSide === "bottom" && idealCenter.y < this.toPos.y ||
        this.toSide === "left" && idealCenter.x > this.toPos.x ||
        this.toSide === "right" && idealCenter.x < this.toPos.x

      if (isPathCollidingAtFrom || isPathCollidingAtTo) {
        pathArray = [this.fromPos]

        if (isPathCollidingAtFrom) {
          const direction = BBoxHelper.direction(this.fromSide)

          const firstDetourPoint = isFromHorizontal ? {
            x: this.fromBBoxSidePos.x + direction * CanvasHelper.GRID_SIZE,
            y: this.fromBBoxSidePos.y
          } : {
            x: this.fromBBoxSidePos.x,
            y: this.fromBBoxSidePos.y + direction * CanvasHelper.GRID_SIZE
          }

          pathArray.push(firstDetourPoint)
        }

        pathArray.push(this.toPos)

        // TODO: Calculate center
        center = { 
          x: (this.fromPos.x + this.toPos.x) / 2,
          y: (this.fromPos.y + this.toPos.y) / 2
        }
      } else {
        // L-shape: Different axis, no collision
        pathArray = [
          this.fromPos,
          idealCenter,
          this.toPos
        ]

        center = { 
          x: pathArray[1].x,
          y: pathArray[1].y
        }
      }
    }

    const svgPath = this.plugin.settings.getSetting('edgeStyleSquarePathRounded')
      ? SvgPathHelper.pathArrayToRoundedSvgPath(pathArray, ROUNDED_EDGE_RADIUS)
      : SvgPathHelper.pathArrayToSvgPath(pathArray)

    return { svgPath, center, rotateArrows: false }
  }
}