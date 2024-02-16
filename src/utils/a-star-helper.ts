import { BBox, Position } from "src/@types/Canvas"
import * as BBoxHelper from "src/utils/bbox-helper"

interface Node extends Position {
  x: number
  y: number
  gCost: number
  hCost: number
  fCost: number
  parent: Node | null
}

function heuristic(node: Node, end: Node): number {
  // Manhattan distance
  return Math.abs(node.x - end.x) + Math.abs(node.y - end.y)
}

function isBlocked(node: Node, obstacles: BBox[]): boolean {
  for (const obstacle of obstacles) {
    if (BBoxHelper.intersectsBBox(node, obstacle)) return true
  }

  return false
}

// Define a function to calculate movement cost based on direction (if needed)
function getMovementCost(direction: { dx: number; dy: number }): number {
  // Adjust this based on your specific cost rules
  return direction.dx !== 0 && direction.dy !== 0 ? 1.414 : 1;
}

function getNeighbors(node: Node, obstacles: BBox[], gridResolution: number): Node[] {
  const neighbors: Node[] = []
  const directions = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
  ]

  for (const direction of directions) {
    const cost = direction.dx === 0 || direction.dy === 0 ? 1 : 1.414

    const neighbor = {
      x: node.x + direction.dx * gridResolution,
      y: node.y + direction.dy * gridResolution,
      gCost: node.gCost + cost,
      hCost: 0,
      fCost: 0,
      parent: null,
    }

    if (isBlocked(neighbor, obstacles)) {
      continue
    }

    neighbors.push(neighbor)
  }

  return neighbors
}

function reconstructPath(node: Node): Node[] {
  const path: Node[] = []
  while (node) {
    path.push(node)
    node = node.parent!
  }
  return path.reverse()
}

export function aStar(startPos: Position, endPos: Position, obstacles: BBox[], gridResolution: number): Position[] | null {
  const start: Node = {
    x: Math.round(startPos.x / gridResolution) * gridResolution,
    y: Math.round(startPos.y / gridResolution) * gridResolution,
    gCost: 0,
    hCost: 0,
    fCost: 0,
    parent: null
  }

  const end: Node = {
    x: Math.round(endPos.x / gridResolution) * gridResolution,
    y: Math.round(endPos.y / gridResolution) * gridResolution,
    gCost: 0,
    hCost: 0,
    fCost: 0,
    parent: null
  }

  const openSet: Node[] = [start]
  const closedSet: Node[] = []

  while (openSet.length > 0) {
    // Find the node with the lowest fCost in the open set
    let current: Node | null = null;
    let lowestFCost = Infinity;
    for (const node of openSet) {
      if (node.fCost < lowestFCost) {
        current = node;
        lowestFCost = node.fCost;
      }
    }

    if (!current) {
      // No path found
      return null;
    }

    // Remove the current node from the open set and add it to the closed set
    openSet.splice(openSet.indexOf(current), 1);
    closedSet.push(current);

    if (current.x === end.x && current.y === end.y) {
      // Found the goal!
      return [startPos, ...reconstructPath(current), endPos];
    }

    // Expand neighbors
    for (const neighbor of getNeighbors(current, obstacles, gridResolution)) {
      if (closedSet.includes(neighbor)) {
        continue;
      }

      // Calculate tentative gCost
      const tentativeGCost = current.gCost + getMovementCost({
        dx: neighbor.x - current.x,
        dy: neighbor.y - current.y,
      });

      // Check if neighbor is not already in the open set or if the new gCost is lower
      if (!openSet.includes(neighbor) || tentativeGCost < neighbor.gCost) {
        neighbor.parent = current;
        neighbor.gCost = tentativeGCost;
        neighbor.hCost = heuristic(neighbor, end);
        neighbor.fCost = neighbor.gCost + neighbor.hCost;

        // Add neighbor to the open set
        openSet.push(neighbor);
      }
    }
  }

  // No path found
  return null;
}