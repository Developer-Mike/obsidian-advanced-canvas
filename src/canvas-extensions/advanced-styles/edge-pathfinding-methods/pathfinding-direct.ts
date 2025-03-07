import SvgPathHelper from "src/utils/svg-path-helper"
import EdgePathfindingMethod, { EdgePath } from "./edge-pathfinding-method"

export default class EdgePathfindingDirect extends EdgePathfindingMethod {
  getPath(): EdgePath {
    return {
      svgPath: SvgPathHelper.pathArrayToSvgPath([this.fromPos, this.toPos]),
      center: {
        x: (this.fromPos.x + this.toPos.x) / 2,
        y: (this.fromPos.y + this.toPos.y) / 2
      },
      rotateArrows: true
    }
  }
}