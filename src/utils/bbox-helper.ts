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

export function insideBBox(position: Position|BBox, bbox: BBox, canTouchEdge: Boolean): boolean {
  const providedBBox = {
    minX: (position as BBox).minX ?? (position as Position).x,
    minY: (position as BBox).minY ?? (position as Position).y,
    maxX: (position as BBox).maxX ?? (position as Position).x,
    maxY: (position as BBox).maxY ?? (position as Position).y
  }
  
  return canTouchEdge ? providedBBox.minX >= bbox.minX && providedBBox.maxX <= bbox.maxX && providedBBox.minY >= bbox.minY && providedBBox.maxY <= bbox.maxY :
    providedBBox.minX > bbox.minX && providedBBox.maxX < bbox.maxX && providedBBox.minY > bbox.minY && providedBBox.maxY < bbox.maxY
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