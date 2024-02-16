import { BBox, Position } from "src/@types/Canvas"

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