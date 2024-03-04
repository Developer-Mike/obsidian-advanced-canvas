import { Position } from "src/@types/Canvas"

export function pathArrayToSvgPath(positions: Position[], rounded = false): string {
  const tension = 0.2
  let newPositions = [...positions]

  if (rounded && positions.length > 2) {
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
  }
    
  for (let i = 0; i < newPositions.length - 2; i++) {
    const p1 = newPositions[i]
    const p2 = newPositions[i + 1]
    const p3 = newPositions[i + 2]

    const currentDirection = {
      x: p2.x - p1.x,
      y: p2.y - p1.y
    }

    const nextDirection = {
      x: p3.x - p2.x,
      y: p3.y - p2.y
    }

    if (currentDirection.x !== nextDirection.x && currentDirection.y !== nextDirection.y) continue

    newPositions.splice(i + 1, 1)
    i--
  }

  return newPositions.map((position, index) => 
    `${index === 0 ? 'M' : 'L'} ${position.x} ${position.y}`
  ).join(' ')
}