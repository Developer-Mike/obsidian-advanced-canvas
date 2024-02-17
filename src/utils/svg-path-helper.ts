import { Position } from "src/@types/Canvas"

export function pathArrayToSvgPath(positions: Position[], rounded = false): string {
  if (!rounded || positions.length < 2) {
    return positions.map((position, index) => 
      `${index === 0 ? 'M' : 'L'} ${position.x} ${position.y}`
    ).join(' ')
  }

  const tension = 0.3
  const pathData = []

  pathData.push(`M ${positions[0].x} ${positions[0].y}`)

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

    pathData.push(`L ${x} ${y}`)
  }

  const lastPoint = positions[positions.length - 1]
  pathData.push(`L ${lastPoint.x} ${lastPoint.y}`)

  return pathData.join(" ")
}