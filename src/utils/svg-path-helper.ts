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

  static pathArrayToRoundedSvgPath(pathArray: Position[], targetRadius: number): string {
    if (pathArray.length < 3)
      return this.pathArrayToSvgPath(pathArray)

    // Remove duplicate points
    pathArray = pathArray.filter((position, index) => {
      if (index === 0) return true

      const previous = pathArray[index - 1]
      return !(position.x === previous.x && position.y === previous.y)
    })

    const commands: string[] = []
    commands.push(`M ${pathArray[0].x} ${pathArray[0].y}`)

    for (let i = 1; i < pathArray.length - 1; i++) {
      const previous = pathArray[i - 1]
      const current = pathArray[i]
      const next = pathArray[i + 1]

      const prevDelta = { x: current.x - previous.x, y: current.y - previous.y }
      const nextDelta = { x: next.x - current.x, y: next.y - current.y }
      const prevLen = Math.sqrt(prevDelta.x * prevDelta.x + prevDelta.y * prevDelta.y)
      const nextLen = Math.sqrt(nextDelta.x * nextDelta.x + nextDelta.y * nextDelta.y)

      const prevUnit = prevLen ? { x: prevDelta.x / prevLen, y: prevDelta.y / prevLen } : { x: 0, y: 0 }
      const nextUnit = nextLen ? { x: nextDelta.x / nextLen, y: nextDelta.y / nextLen } : { x: 0, y: 0 }

      let dot = prevUnit.x * nextUnit.x + prevUnit.y * nextUnit.y
      dot = Math.max(-1, Math.min(1, dot))
      const angle = Math.acos(dot)

      // if the angle is nearly 0 (or almost straight) no rounding is needed
      if (angle < 0.01 || Math.abs(Math.PI - angle) < 0.01) {
        commands.push(`L ${current.x} ${current.y}`)
        continue
      }

      // compute the desired offset along the segments for the target radius
      const desiredOffset = targetRadius * Math.tan(angle / 2)
      // clamp the offset to half of each adjacent segment so it doesn't overshoot
      const d = Math.min(desiredOffset, prevLen / 2, nextLen / 2)
      // recalc the effective radius in case d was clamped
      const effectiveRadius = d / Math.tan(angle / 2)

      const firstAnchor = {
        x: current.x - prevUnit.x * d,
        y: current.y - prevUnit.y * d
      }
      const secondAnchor = {
        x: current.x + nextUnit.x * d,
        y: current.y + nextUnit.y * d
      }

      commands.push(`L ${firstAnchor.x} ${firstAnchor.y}`)

      // determine the sweep flag using the cross product
      const cross = prevDelta.x * nextDelta.y - prevDelta.y * nextDelta.x
      const sweepFlag = cross < 0 ? 0 : 1

      commands.push(`A ${effectiveRadius} ${effectiveRadius} 0 0 ${sweepFlag} ${secondAnchor.x} ${secondAnchor.y}`)
    }

    const last = pathArray[pathArray.length - 1]
    commands.push(`L ${last.x} ${last.y}`)

    return commands.join(' ')
  }
}