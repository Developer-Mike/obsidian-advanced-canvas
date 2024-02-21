import { BBox, Position, Side } from "src/@types/Canvas"

export function scaleBBox(bbox: BBox, scale: number): BBox {
  let diffX = (scale - 1) * (bbox.maxX - bbox.minX)
  let diffY = (scale - 1) * (bbox.maxY - bbox.minY)

  return {
    minX: bbox.minX - diffX / 2,
    maxX: bbox.maxX + diffX / 2,
    minY: bbox.minY - diffY / 2,
    maxY: bbox.maxY + diffY / 2
  }
}

export function intersectsBBox(position: Position, bbox: BBox): boolean {
  return position.x >= bbox.minX && position.x <= bbox.maxX && position.y >= bbox.minY && position.y <= bbox.maxY
}

export function enlargeBBox(bbox: BBox, padding: number): BBox {
  return {
    minX: bbox.minX - padding,
    minY: bbox.minY - padding,
    maxX: bbox.maxX + padding,
    maxY: bbox.maxY + padding
  }
}

export function getCenterOfBBoxSide(bbox: BBox, side: Side): Position {
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