import { BBox, Position } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"
import CanvasHelper from "src/utils/canvas-helper"
import { CanvasFileNodeData, CanvasGroupNodeData } from "src/@types/AdvancedJsonCanvas"

const MAX_MS_CALCULATION = 100
const BASIC_DIRECTIONS = [
  { dx: 1, dy: 0 }, 
  { dx: -1, dy: 0 }, 
  { dx: 0, dy: 1 }, 
  { dx: 0, dy: -1 },
] as const
const DIAGONAL_DIRECTIONS = [
  { dx: 1, dy: 1 }, 
  { dx: -1, dy: 1 }, 
  { dx: 1, dy: -1 }, 
  { dx: -1, dy: -1 },
] as const
const DIAGONAL_COST = Math.sqrt(2)

const ROUND_PATH_RADIUS = 5
const SMOOTHEN_PATH_TENSION = 0.2

class Node {
  x: number
  y: number
  gCost: number
  hCost: number
  fCost: number
  parent: Node | null

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

// FIXME: Performance improvements
export default class EdgePathfindingAStar extends EdgePathfindingMethod {
  getPath(): EdgePath | null {        
    const nodeBBoxes = [...this.canvas.nodes.values()]
      .filter(node => {
        const nodeData = node.getData()

        if ((nodeData as CanvasFileNodeData).portal === true) return false // Exclude open portals

        // Exclude (group) nodes that contain either the start or end position
        const nodeBBox = node.getBBox()
        const nodeContainsFromPos = BBoxHelper.insideBBox(this.fromPos, nodeBBox, true)
        const nodeContainsToPos = BBoxHelper.insideBBox(this.toPos, nodeBBox, true)

        return !nodeContainsFromPos && !nodeContainsToPos
      }).map(node => node.getBBox())
    
    const fromPosWithMargin = BBoxHelper.moveInDirection(this.fromPos, this.fromSide, 10)
    const toPosWithMargin = BBoxHelper.moveInDirection(this.toPos, this.toSide, 10)

    const allowDiagonal = this.plugin.settings.getSetting('edgeStylePathfinderAllowDiagonal')
    let pathArray = this.aStarAlgorithm(fromPosWithMargin, toPosWithMargin, nodeBBoxes, CanvasHelper.GRID_SIZE / 2, allowDiagonal)
    if (!pathArray) return null // No path found - use default path

    // Make connection points to the node removing the margin
    pathArray.splice(0, 0, this.fromPos)
    pathArray.splice(pathArray.length, 0, this.toPos)

    // Smoothen path
    let svgPath: string
    const roundPath = this.plugin.settings.getSetting('edgeStylePathfinderPathRounded')
    if (roundPath) {
      if (allowDiagonal)
        svgPath = SvgPathHelper.pathArrayToSvgPath(SvgPathHelper.smoothenPathArray(pathArray, SMOOTHEN_PATH_TENSION))
      else
        svgPath = SvgPathHelper.pathArrayToRoundedSvgPath(pathArray, ROUND_PATH_RADIUS)
    } else svgPath = SvgPathHelper.pathArrayToSvgPath(pathArray)

    return {
      svgPath: svgPath,
      center: pathArray[Math.floor(pathArray.length / 2)],
      rotateArrows: false
    }
  }

  private aStarAlgorithm(fromPos: Position, toPos: Position, obstacles: BBox[], gridResolution: number, allowDiagonal: boolean): Position[] | null {
    const start: Node = new Node(
      Math.floor(fromPos.x / gridResolution) * gridResolution,
      Math.floor(fromPos.y / gridResolution) * gridResolution
    )
    // Round start and end positions to the nearest grid cell outside of the nodes to connect
    if (this.fromSide === 'right' && fromPos.x !== start.x) start.x += gridResolution
    if (this.fromSide === 'bottom' && fromPos.y !== start.y) start.y += gridResolution
  
    const end: Node = new Node(
      Math.floor(toPos.x / gridResolution) * gridResolution,
      Math.floor(toPos.y / gridResolution) * gridResolution
    )
    // Round start and end positions to the nearest grid cell outside of the nodes to connect
    if (this.toSide === 'right' && toPos.x !== end.x) end.x += gridResolution
    if (this.toSide === 'bottom' && toPos.y !== end.y) end.y += gridResolution
    
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
      for (const neighbor of this.getPossibleNeighbors(current, obstacles, gridResolution, allowDiagonal)) {
        // Skip if already processed
        if (neighbor.inList(closedSet))
          continue
  
        // Calculate tentative gCost
        const tentativeGCost = current.gCost + (allowDiagonal ? this.getMovementCost({
          dx: neighbor.x - current.x,
          dy: neighbor.y - current.y,
        }) : 1)
  
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
  
  private getPossibleNeighbors(node: Node, obstacles: BBox[], gridResolution: number, allowDiagonal: boolean): Node[] {
    const neighbors: Node[] = []
    
    const availableDirections = allowDiagonal ? [...BASIC_DIRECTIONS, ...DIAGONAL_DIRECTIONS] : BASIC_DIRECTIONS
    for (const direction of availableDirections) {
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