import { Side } from "src/@types/AdvancedJsonCanvas"
import { BBox, Position } from "src/@types/Canvas"

export default class BBoxHelper {
  static combineBBoxes(bboxes: BBox[]): BBox {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (let bbox of bboxes) {
      minX = Math.min(minX, bbox.minX)
      minY = Math.min(minY, bbox.minY)
      maxX = Math.max(maxX, bbox.maxX)
      maxY = Math.max(maxY, bbox.maxY)
    }

    return { minX, minY, maxX, maxY }
  }

  static scaleBBox(bbox: BBox, scale: number): BBox {
    let diffX = (scale - 1) * (bbox.maxX - bbox.minX)
    let diffY = (scale - 1) * (bbox.maxY - bbox.minY)

    return {
      minX: bbox.minX - diffX / 2,
      maxX: bbox.maxX + diffX / 2,
      minY: bbox.minY - diffY / 2,
      maxY: bbox.maxY + diffY / 2
    }
  }

  static isColliding(bbox1: BBox, bbox2: BBox): boolean {
    return bbox1.minX <= bbox2.maxX && bbox1.maxX >= bbox2.minX && bbox1.minY <= bbox2.maxY && bbox1.maxY >= bbox2.minY
  }

  static insideBBox(position: Position | BBox, bbox: BBox, canTouchEdge: boolean): boolean {
    if ('x' in position) {
      const x = position.x, y = position.y
      return canTouchEdge
        ? x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY
        : x > bbox.minX && x < bbox.maxX && y > bbox.minY && y < bbox.maxY
    }
  
    return canTouchEdge
      ? position.minX >= bbox.minX && position.maxX <= bbox.maxX &&
        position.minY >= bbox.minY && position.maxY <= bbox.maxY
      : position.minX > bbox.minX && position.maxX < bbox.maxX &&
        position.minY > bbox.minY && position.maxY < bbox.maxY
  }

  static enlargeBBox(bbox: BBox, padding: number): BBox {
    return {
      minX: bbox.minX - padding,
      minY: bbox.minY - padding,
      maxX: bbox.maxX + padding,
      maxY: bbox.maxY + padding
    }
  }

  static moveInDirection(position: Position, side: Side, distance: number): Position {
    switch (side) {
      case 'top':
        return { x: position.x, y: position.y - distance }
      case 'right':
        return { x: position.x + distance, y: position.y }
      case 'bottom':
        return { x: position.x, y: position.y + distance }
      case 'left':
        return { x: position.x - distance, y: position.y }
    }
  }

  static getCenterOfBBoxSide(bbox: BBox, side: Side): Position {
    switch (side) {
      case 'top':
        return { x: (bbox.minX + bbox.maxX) / 2, y: bbox.minY }
      case 'right':
        return { x: bbox.maxX, y: (bbox.minY + bbox.maxY) / 2 }
      case 'bottom':
        return { x: (bbox.minX + bbox.maxX) / 2, y: bbox.maxY }
      case 'left':
        return { x: bbox.minX, y: (bbox.minY + bbox.maxY) / 2 }
    }
  }

  static getSideVector(side?: Side): Position {
    switch (side) {
      case 'top':
        return { x: 0, y: 1 }
      case 'right':
        return { x: 1, y: 0 }
      case 'bottom':
        return { x: 0, y: -1 }
      case 'left':
        return { x: -1, y: 0 }
      default:
        return { x: 0, y: 0 }
    }
  }

  static getOppositeSide(side: Side): Side {
    switch (side) {
      case 'top':
        return 'bottom'
      case 'right':
        return 'left'
      case 'bottom':
        return 'top'
      case 'left':
        return 'right'
    }
  }

  static isHorizontal(side: Side): boolean {
    return side === 'left' || side === 'right'
  }

  static direction(side: Side): number {
    return (side === 'right' || side === 'bottom') ? 1 : -1
  }
}