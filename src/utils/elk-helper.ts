import ElkConstructor, { ELK, ElkExtendedEdge, ElkNode } from "elkjs";
import { CanvasData } from "src/@types/AdvancedJsonCanvas"
import { Canvas } from "src/@types/Canvas";

export type ElkLayout = 'box' | 'layered' | 'stress' | 'mrtree' | 'radial' | 'force'

export default class ElkHelper {
  static readonly LAYOUTS: ElkLayout[] = ['box', 'layered', 'stress', 'mrtree', 'radial', 'force']

  static getEngine(): ELK {
    return new ElkConstructor({
      defaultLayoutOptions: {
        'elk.direction': 'DOWN', // TODO
        'elk.padding': '[20, 20, 20, 20]'
      },
    })
  }

  static toElk(data: CanvasData): ElkNode {
    const elkNodes = data.nodes.map(node => ({
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      ports: [
        {
          id: `port-${node.id}-top`,
          width: node.width,
          height: 0,
        },
        {
          id: `port-${node.id}-bottom`,
          width: node.width,
          height: 0,
        },
        {
          id: `port-${node.id}-left`,
          width: 0,
          height: node.height,
        },
        {
          id: `port-${node.id}-right`,
          width: 0,
          height: node.height,
        },
      ]
    })) satisfies ElkNode[]

    const elkEdges = data.edges.map(edge => ({
      id: edge.id,
      sources: [edge.fromFloating ? edge.fromNode : `port-${edge.fromNode}-${edge.fromSide}`],
      targets: [edge.toFloating ? edge.toNode : `port-${edge.toNode}-${edge.toSide}`],
    })) satisfies ElkExtendedEdge[]

    // TODO: Fix when grabbing new edge

    return {
      id: "root",
      children: elkNodes,
      edges: elkEdges,
    }
  }

  static applyElk(canvas: Canvas, layout: ElkNode) {
    for (const node of canvas.nodes.values()) {
      const elkNode = layout.children?.find(n => n.id === node.id)
      if (!elkNode || !elkNode.x || !elkNode.y) continue

      node.setData({
        ...node.getData(),
        x: elkNode.x,
        y: elkNode.y,
      })
    }

    canvas.pushHistory(canvas.getData())
  }
}