import { Position } from "src/@types/Canvas"

export default class SvgPathHelper {
  static smoothenPathArray(positions: Position[], tension: number): Position[] {
    let newPositions = [...positions]
    if (positions.length <= 2) return newPositions

    newPositions = [positions[0]]

    for (let i = 1; i < positions.length - 2; i++) {
      const p1 = positions[i]
      const p2 = positions[i + 1]
      const p3 = positions[i + 2]

      const t1 = (1 - tension) / 2
      const t2 = 1 - t1

      const x =
        t2 * t2 * t2 * p1.x +
        3 * t2 * t2 * t1 * p2.x +
        3 * t2 * t1 * t1 * p3.x +
        t1 * t1 * t1 * p2.x

      const y =
        t2 * t2 * t2 * p1.y +
        3 * t2 * t2 * t1 * p2.y +
        3 * t2 * t1 * t1 * p3.y +
        t1 * t1 * t1 * p2.y

      newPositions.push({ x: x, y: y })
    }

    const lastPoint = positions[positions.length - 1]
    newPositions.push(lastPoint)

    return newPositions
  }

  static pathArrayToSvgPath(positions: Position[]): string {
    for (let i = 0; i < positions.length - 2; i++) {
      const p1 = positions[i]
      const p2 = positions[i + 1]
      const p3 = positions[i + 2]

      const currentDirection = {
        x: p2.x - p1.x,
        y: p2.y - p1.y
      }

      const nextDirection = {
        x: p3.x - p2.x,
        y: p3.y - p2.y
      }

      if (currentDirection.x !== nextDirection.x && currentDirection.y !== nextDirection.y) continue

      positions.splice(i + 1, 1)
      i--
    }

    return positions.map((position, index) => 
      `${index === 0 ? 'M' : 'L'} ${position.x} ${position.y}`
    ).join(' ')
  }

  static pathArrayToRoundedSvgPath(pathArray: Position[], radius: number): string {
    const spacedPathArray: Position[] = []
    if (pathArray.length >= 1) spacedPathArray.push(pathArray[0])

    for (let i = 0; i < pathArray.length - 1; i++) {
      const start = pathArray[i]
      const end = pathArray[i + 1]
    
      const delta = {
        x: end.x - start.x,
        y: end.y - start.y
      }
      const unit = {
        x: Math.max(-1, Math.min(1, delta.x)),
        y: Math.max(-1, Math.min(1, delta.y))
      }
    
      // Check if the line is already shorter than the radius -> Would result in a weird curve
      if (Math.max(Math.abs(delta.x), Math.abs(delta.y)) <= radius * 2)
        continue
    
      let adjustedStart = i > 0 ? {
        x: start.x + unit.x * radius,
        y: start.y + unit.y * radius
      } : start
      let adjustedEnd = i < pathArray.length - 2 ? {
        x: end.x - unit.x * radius,
        y: end.y - unit.y * radius
      } : end

      spacedPathArray.push(adjustedStart)
      spacedPathArray.push(adjustedEnd)
    }
    
    if (pathArray.length >= 1) spacedPathArray.push(pathArray[pathArray.length - 1])

    return spacedPathArray.map((position, index) => {
      if (index === 0) return `M ${position.x} ${position.y}`
      if (index % 2 === 0 || index === 1 || index === spacedPathArray.length - 1) return `L ${position.x} ${position.y}`

      const previousLine = {
        x: spacedPathArray[index - 1].x - spacedPathArray[index - 2].x,
        y: spacedPathArray[index - 1].y - spacedPathArray[index - 2].y
      }
      const previousLineHorizontal = previousLine.x !== 0
      const previousLinePositive = previousLine.x > 0 || previousLine.y > 0

      const upcomingLine = {
        x: spacedPathArray[index + 1].x - spacedPathArray[index].x,
        y: spacedPathArray[index + 1].y - spacedPathArray[index].y
      }
      const upcomingLineHorizontal = upcomingLine.x !== 0
      const upcomingLinePositive = upcomingLine.x > 0 || upcomingLine.y > 0

      if (previousLineHorizontal === upcomingLineHorizontal) return `L ${position.x} ${position.y}` // Shouldn't happen

      const southEastDirection = (previousLinePositive === upcomingLinePositive) === previousLineHorizontal === (index % 2 === 1)
      return `A ${radius} ${radius} 0 0 ${southEastDirection ? 1 : 0} ${position.x} ${position.y}`
    }).join(' ')
  }
}