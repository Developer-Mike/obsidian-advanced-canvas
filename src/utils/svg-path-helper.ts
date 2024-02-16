import { Position } from "src/@types/Canvas";

export function pathArrayToSvgPath(pathArray: Position[]): string {
  return pathArray.map((position, index) => `${index === 0 ? 'M' : 'L'} ${position.x} ${position.y}`).join(' ')
}

export function svgPathToPathArray(svgPath: string): Position[] {
  return svgPath.split(' ').map((part, index) => {
    if (index % 3 === 1) {
      return {
        x: parseFloat(part),
        y: parseFloat(part)
      }
    }
  }).filter((position) => position !== undefined) as Position[]
}
