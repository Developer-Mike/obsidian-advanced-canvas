import { BBox, Canvas, Position, Side } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import BBoxHelper from "src/utils/bbox-helper"
import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"

const MAX_MS_CALCULATION = 100
const DIRECTIONS = [
  { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
  { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
] as const
const DIAGONAL_COST = Math.sqrt(2)

class Node {
  x: number
  y: number
  gCost: number
  hCost: number
  fCost: number
  parent: Node|null

  constructor(x: number, y: number) {
    this.x = x
    this.y = y

    this.gCost = 0
    this.hCost = 0
    this.fCost = 0
    this.parent = null
  }

  // Only check for x and y, not gCost, hCost, fCost, or parent
  inList(nodes: Node[]): boolean {
    return nodes.some(n => n.x === this.x && n.y === this.y)
  }
}

export default class EdgePathfindingAStar extends EdgePathfindingMethod {
  getPath(plugin: AdvancedCanvasPlugin, canvas: Canvas, fromPos: Position, _fromBBoxSidePos: Position, fromSide: Side, toPos: Position, _toBBoxSidePos: Position, toSide: Side): EdgePath | null {        
    const nodeBBoxes = [...canvas.nodes.values()]
      .filter(node => {
        const nodeData = node.getData()

        if (nodeData.portalToFile !== undefined) return false // Exclude open portals

        // Exclude group nodes that contain either the start or end position
        const isGroup = nodeData.type === 'group'
        if (isGroup) {
          const groupBBox = node.getBBox()
          return !BBoxHelper.insideBBox(fromPos, groupBBox, true) && !BBoxHelper.insideBBox(toPos, groupBBox, true)
        }
        
        return true
      }).map(node => node.getBBox())
    
    const fromPosWithMargin = BBoxHelper.moveInDirection(fromPos, fromSide, 10)
    const toPosWithMargin = BBoxHelper.moveInDirection(toPos, toSide, 10)

    const gridResolution = plugin.settings.getSetting('edgeStylePathfinderGridResolution')
    const pathArray = this.aStarAlgorithm(fromPosWithMargin, fromSide, toPosWithMargin, toSide, nodeBBoxes, gridResolution)
    if (!pathArray) return null // No path found - use default path

    // Make connection points to the node removing the margin
    pathArray.splice(0, 0, fromPos)
    pathArray.splice(pathArray.length, 0, toPos)

    const roundedPath = plugin.settings.getSetting('edgeStylePathfinderPathRounded')
    const svgPath = SvgPathHelper.pathArrayToSvgPath(pathArray, roundedPath)

    return {
      svgPath: svgPath,
      center: pathArray[Math.floor(pathArray.length / 2)],
      rotateArrows: false
    }
  }

  private aStarAlgorithm(fromPos: Position, fromSide: Side, toPos: Position, toSide: Side, obstacles: BBox[], gridResolution: number): Position[] | null {
    const start: Node = new Node(
      Math.floor(fromPos.x / gridResolution) * gridResolution,
      Math.floor(fromPos.y / gridResolution) * gridResolution
    )
    // Round start and end positions to the nearest grid cell outside of the nodes to connect
    if (fromSide === 'right' && fromPos.x !== start.x) start.x += gridResolution
    if (fromSide === 'bottom' && fromPos.y !== start.y) start.y += gridResolution
  
    const end: Node = new Node(
      Math.floor(toPos.x / gridResolution) * gridResolution,
      Math.floor(toPos.y / gridResolution) * gridResolution
    )
    // Round start and end positions to the nearest grid cell outside of the nodes to connect
    if (toSide === 'right' && toPos.x !== end.x) end.x += gridResolution
    if (toSide === 'bottom' && toPos.y !== end.y) end.y += gridResolution
    
    // Check if start and end positions are valid
    if (this.isInsideObstacle(start, obstacles) || this.isInsideObstacle(end, obstacles)) return null
  
    const openSet: Node[] = [start]
    const closedSet: Node[] = []

    const startTimestamp = performance.now()
  
    while (openSet.length > 0) {
      // Find the node with the lowest fCost in the open set
      let current: Node|null = null
      let lowestFCost = Infinity
  
      for (const node of openSet) {
        if (node.fCost < lowestFCost) {
          current = node
          lowestFCost = node.fCost
        }
      }

      // Check if the calculation is taking too long
      if (performance.now() - startTimestamp > MAX_MS_CALCULATION)
        return null
  
      // No path found
      if (!current)
        return null
  
      // Remove the current node from the open set and add it to the closed set
      openSet.splice(openSet.indexOf(current), 1)
      closedSet.push(current)
  
      // Check if we have reached the end
      if (current.x === end.x && current.y === end.y)
        return [fromPos, ...this.reconstructPath(current), toPos].map(node => ({ x: node.x, y: node.y }))
  
      // Location is not start or end, all touching positions are invalid
      if (!(current.x === start.x && current.y === start.y) && this.isTouchingObstacle(current, obstacles))
        continue
  
      // Expand neighbors
      for (const neighbor of this.getPossibleNeighbors(current, obstacles, gridResolution)) {
        // Skip if already processed
        if (neighbor.inList(closedSet))
          continue
  
        // Calculate tentative gCost
        const tentativeGCost = current.gCost + this.getMovementCost({
          dx: neighbor.x - current.x,
          dy: neighbor.y - current.y,
        })
  
        // Check if neighbor is not already in the open set or if the new gCost is lower
        if (!neighbor.inList(openSet) || tentativeGCost < neighbor.gCost) {
          neighbor.parent = current
          neighbor.gCost = tentativeGCost
          neighbor.hCost = this.heuristic(neighbor, end)
          neighbor.fCost = neighbor.gCost + neighbor.hCost
  
          // Add neighbor to the open set
          openSet.push(neighbor)
        }
      }
    }
  
    // No path found
    return null
  }
  
  // Manhattan distance
  private heuristic(node: Node, end: Node): number {
    return Math.abs(node.x - end.x) + Math.abs(node.y - end.y)
  }
  
  // Define a function to check if a position isn't inside any obstacle
  private isTouchingObstacle(node: Position, obstacles: BBox[]): boolean {
    return obstacles.some(obstacle => BBoxHelper.insideBBox(node, obstacle, true))
  }
  
  private isInsideObstacle(node: Position, obstacles: BBox[]): boolean {
    return obstacles.some(obstacle => BBoxHelper.insideBBox(node, obstacle, false))
  }
  
  // Define a function to calculate movement cost based on direction
  private getMovementCost(direction: { dx: number; dy: number }): number {
    return direction.dx !== 0 && direction.dy !== 0 ? DIAGONAL_COST : 1
  }
  
  private getPossibleNeighbors(node: Node, obstacles: BBox[], gridResolution: number): Node[] {
    const neighbors: Node[] = []
    
    for (const direction of DIRECTIONS) {
      const neighbor = new Node(
        node.x + direction.dx * gridResolution, 
        node.y + direction.dy * gridResolution
      )
      neighbor.gCost = node.gCost + this.getMovementCost(direction)
  
      if (this.isInsideObstacle(neighbor, obstacles)) continue
  
      neighbors.push(neighbor)
    }
  
    return neighbors
  }
  
  private reconstructPath(node: Node): Node[] {
    const path: Node[] = []
    while (node) {
      path.push(node)
      node = node.parent!
    }
    return path.reverse()
  }
}