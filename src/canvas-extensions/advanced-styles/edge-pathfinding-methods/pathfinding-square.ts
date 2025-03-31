import { Position } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import { Side } from "src/@types/AdvancedJsonCanvas"

const ROUNDED_EDGE_RADIUS = 5

export default class EdgePathfindingSquare extends EdgePathfindingMethod {
  getPath(): EdgePath | null {
    const pathArray: Position[] = []
    let center: Position = { 
      x: (this.fromPos.x + this.toPos.x) / 2, 
      y: (this.fromPos.y + this.toPos.y) / 2
    }

    const idealCenter = BBoxHelper.isHorizontal(this.fromSide) ? {
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
  
    if (this.fromSide === this.toSide) {
      const uPath = this.getUPath(this.fromPos, this.toPos, this.fromSide, this.toSide)

      pathArray.push(...uPath.pathArray)
      center = uPath.center
    } else if (BBoxHelper.isHorizontal(this.fromSide) === BBoxHelper.isHorizontal(this.toSide)) {
      let zPath: PartialPath
      if (!isPathCollidingAtFrom || !isPathCollidingAtTo) {
        zPath = this.getZPath(this.fromPos, this.toPos, this.fromSide, this.toSide)

        pathArray.push(...zPath.pathArray)
      } else {
        const fromDirection = BBoxHelper.direction(this.fromSide)
        const firstFromDetourPoint = BBoxHelper.isHorizontal(this.fromSide) ? {
          x: CanvasHelper.alignToGrid(this.fromBBoxSidePos.x + fromDirection * CanvasHelper.GRID_SIZE),
          y: this.fromBBoxSidePos.y
        } : {
          x: this.fromBBoxSidePos.x,
          y: CanvasHelper.alignToGrid(this.fromBBoxSidePos.y + fromDirection * CanvasHelper.GRID_SIZE)
        }

        const toDirection = BBoxHelper.direction(this.toSide)
        const firstToDetourPoint = BBoxHelper.isHorizontal(this.toSide) ? {
          x: CanvasHelper.alignToGrid(this.toBBoxSidePos.x + toDirection * CanvasHelper.GRID_SIZE),
          y: this.toBBoxSidePos.y
        } : {
          x: this.toBBoxSidePos.x,
          y: CanvasHelper.alignToGrid(this.toBBoxSidePos.y + toDirection * CanvasHelper.GRID_SIZE)
        }

        const newFromSide = BBoxHelper.isHorizontal(this.fromSide) ? (
          firstFromDetourPoint.y < this.fromPos.y ? "top" : "bottom"
        ) : (
          firstFromDetourPoint.x < firstToDetourPoint.x ? "right" : "left"
        )

        zPath = this.getZPath(firstFromDetourPoint, firstToDetourPoint, newFromSide, BBoxHelper.getOppositeSide(newFromSide))

        pathArray.push(this.fromPos)
        pathArray.push(...zPath.pathArray)
        pathArray.push(this.toPos)
      }

      center = zPath.center
    } else {
      // Different axis -> L-shape or 5-point path
      if (isPathCollidingAtFrom || isPathCollidingAtTo) {
        if (isPathCollidingAtFrom && isPathCollidingAtTo) {
          const direction = BBoxHelper.direction(this.fromSide)

          let firstFromDetourPoint: Position
          let secondFromDetourPoint: Position
          if (BBoxHelper.isHorizontal(this.fromSide)) {
            const combinedBBoxes = BBoxHelper.combineBBoxes([this.fromNodeBBox, this.toNodeBBox])

            firstFromDetourPoint = {
              x: CanvasHelper.alignToGrid((direction > 0 ? combinedBBoxes.maxX : combinedBBoxes.minX) + direction * CanvasHelper.GRID_SIZE),
              y: this.fromBBoxSidePos.y
            }

            secondFromDetourPoint = {
              x: firstFromDetourPoint.x,
              y: BBoxHelper.getCenterOfBBoxSide(this.fromNodeBBox, this.toSide).y
            }
          } else {
            const combinedBBoxes = BBoxHelper.combineBBoxes([this.fromNodeBBox, this.toNodeBBox])

            firstFromDetourPoint = {
              x: this.fromBBoxSidePos.x,
              y: CanvasHelper.alignToGrid((direction > 0 ? combinedBBoxes.maxY : combinedBBoxes.minY) + direction * CanvasHelper.GRID_SIZE)
            }

            secondFromDetourPoint = {
              x: BBoxHelper.getCenterOfBBoxSide(this.fromNodeBBox, this.toSide).x,
              y: firstFromDetourPoint.y
            }
          }

          const uPath = this.getUPath(secondFromDetourPoint, this.toPos, this.toSide, this.toSide)

          pathArray.push(this.fromPos)
          pathArray.push(firstFromDetourPoint)
          pathArray.push(...uPath.pathArray)

          center = pathArray[Math.floor(pathArray.length / 2)]
        } else {
          if (isPathCollidingAtFrom) {
            const direction = BBoxHelper.direction(this.fromSide)

            const firstFromDetourPoint = BBoxHelper.isHorizontal(this.fromSide) ? {
              x: CanvasHelper.alignToGrid(this.fromBBoxSidePos.x + direction * CanvasHelper.GRID_SIZE),
              y: this.fromBBoxSidePos.y
            } : {
              x: this.fromBBoxSidePos.x,
              y: CanvasHelper.alignToGrid(this.fromBBoxSidePos.y + direction * CanvasHelper.GRID_SIZE)
            }

            const useUPath = BBoxHelper.isHorizontal(this.fromSide) ?
              (this.toPos.y > BBoxHelper.getCenterOfBBoxSide(this.fromNodeBBox, BBoxHelper.getOppositeSide(this.toSide)).y) === (BBoxHelper.direction(this.toSide) > 0) :
              (this.toPos.x > BBoxHelper.getCenterOfBBoxSide(this.fromNodeBBox, BBoxHelper.getOppositeSide(this.toSide)).x) === (BBoxHelper.direction(this.toSide) > 0)

            const connectionSide = useUPath ?
              this.toSide :
              BBoxHelper.getOppositeSide(this.toSide)

            const secondFromDetourPoint = BBoxHelper.isHorizontal(this.fromSide) ? {
              x: firstFromDetourPoint.x,
              y: BBoxHelper.getCenterOfBBoxSide(this.fromNodeBBox, connectionSide).y
            } : {
              x: BBoxHelper.getCenterOfBBoxSide(this.fromNodeBBox, connectionSide).x,
              y: firstFromDetourPoint.y
            }
            
            const path = useUPath ?
              this.getUPath(secondFromDetourPoint, this.toPos, this.toSide, this.toSide) :
              this.getZPath(secondFromDetourPoint, this.toPos, this.toSide, this.toSide)

            pathArray.push(this.fromPos)
            pathArray.push(firstFromDetourPoint)
            pathArray.push(...path.pathArray)

            center = path.center
          } 
          
          if (isPathCollidingAtTo) {
            const direction = BBoxHelper.direction(this.toSide)

            const firstToDetourPoint = BBoxHelper.isHorizontal(this.toSide) ? {
              x: CanvasHelper.alignToGrid(this.toBBoxSidePos.x + direction * CanvasHelper.GRID_SIZE),
              y: this.toBBoxSidePos.y
            } : {
              x: this.toBBoxSidePos.x,
              y: CanvasHelper.alignToGrid(this.toBBoxSidePos.y + direction * CanvasHelper.GRID_SIZE)
            }

            const useUPath = BBoxHelper.isHorizontal(this.toSide) ?
              (this.fromPos.y > BBoxHelper.getCenterOfBBoxSide(this.toNodeBBox, BBoxHelper.getOppositeSide(this.fromSide)).y) === (BBoxHelper.direction(this.fromSide) > 0) :
              (this.fromPos.x > BBoxHelper.getCenterOfBBoxSide(this.toNodeBBox, BBoxHelper.getOppositeSide(this.fromSide)).x) === (BBoxHelper.direction(this.fromSide) > 0)

            const connectionSide = useUPath ?
              this.fromSide :
              BBoxHelper.getOppositeSide(this.fromSide)

            const secondToDetourPoint = BBoxHelper.isHorizontal(this.toSide) ? {
              x: firstToDetourPoint.x,
              y: BBoxHelper.getCenterOfBBoxSide(this.toNodeBBox, connectionSide).y
            } : {
              x: BBoxHelper.getCenterOfBBoxSide(this.toNodeBBox, connectionSide).x,
              y: firstToDetourPoint.y
            }

            const path = useUPath ? 
              this.getUPath(this.fromPos, secondToDetourPoint, this.fromSide, this.fromSide) :
              this.getZPath(this.fromPos, secondToDetourPoint, this.fromSide, this.fromSide)
            
            pathArray.push(...path.pathArray)
            pathArray.push(secondToDetourPoint)
            pathArray.push(firstToDetourPoint)
            pathArray.push(this.toPos)
            
            center = path.center
          }
        }
      } else {
        // L-shape: Different axis, no collision
        pathArray.push(
          this.fromPos,
          idealCenter,
          this.toPos
        )

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

  private getUPath(fromPos: Position, toPos: Position, fromSide: Side, toSide: Side): PartialPath {
    const direction = BBoxHelper.direction(fromSide)

    if (BBoxHelper.isHorizontal(fromSide)) {
      const xExtremum = direction > 0 ? Math.max(fromPos.x, toPos.x) : Math.min(fromPos.x, toPos.x)
      const x = CanvasHelper.alignToGrid(xExtremum + direction * CanvasHelper.GRID_SIZE)
      return {
        pathArray: [
          fromPos,
          { x: x, y: fromPos.y },
          { x: x, y: toPos.y },
          toPos
        ],
        center: {
          x: x,
          y: (fromPos.y + toPos.y) / 2
        }
      }
    } else {
      const yExtremum = direction > 0 ? Math.max(fromPos.y, toPos.y) : Math.min(fromPos.y, toPos.y)
      const y = CanvasHelper.alignToGrid(yExtremum + direction * CanvasHelper.GRID_SIZE)
      return {
        pathArray: [
          fromPos,
          { x: fromPos.x, y: y },
          { x: toPos.x, y: y },
          toPos
        ],
        center: {
          x: (fromPos.x + toPos.x) / 2,
          y: y
        }
      }
    }
  }

  private getZPath(fromPos: Position, toPos: Position, fromSide: Side, toSide: Side): PartialPath {
    if (BBoxHelper.isHorizontal(fromSide)) {
      const midX = fromPos.x + (toPos.x - fromPos.x) / 2
      return {
        pathArray: [
          fromPos,
          { x: midX, y: fromPos.y },
          { x: midX, y: toPos.y },
          toPos
        ],
        center: {
          x: midX,
          y: (fromPos.y + toPos.y) / 2
        }
      }
    } else {
      const midY = fromPos.y + (toPos.y - fromPos.y) / 2
      return {
        pathArray: [
          fromPos,
          { x: fromPos.x, y: midY },
          { x: toPos.x, y: midY },
          toPos
        ],
        center: {
          x: (fromPos.x + toPos.x) / 2,
          y: midY
        }
      }
    }
  }
}

interface PartialPath {
  pathArray: Position[]
  center: Position
}