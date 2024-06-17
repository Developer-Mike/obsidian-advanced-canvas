import { BBox, CanvasNodeData, Position, Side } from "src/@types/Canvas"

export function combineBBoxes(bboxes: BBox[]): BBox {
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

export function moveInDirection(position: Position, side: Side, distance: number): Position {
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

export function getSideVector(side?: Side): Position {
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

export function bboxFromNodeData(nodeData: CanvasNodeData): BBox {
  return {
    minX: nodeData.x,
    minY: nodeData.y,
    maxX: nodeData.x + nodeData.width,
    maxY: nodeData.y + nodeData.height
  }
}