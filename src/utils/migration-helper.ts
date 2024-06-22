import { Canvas } from "src/@types/Canvas";
import { CanvasEvent } from "src/core/events";
import AdvancedCanvasPlugin from "src/main";

export default class MigrationHelper {
  private plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
  }

  async migrate(): Promise<void> {
    this.migrateNodeAndEdgeStyles()
  }

  private migrateNodeAndEdgeStyles(): void {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => {
        for (const node of canvas.nodes.values()) {
          const nodeData = node.getData()

          const newStyleAttributes: { [key: string]: string | null } = {}

          if (nodeData.isSticker) newStyleAttributes['border'] = 'invisible'
          if (nodeData.borderStyle) newStyleAttributes['border'] = nodeData.borderStyle
          if (nodeData.shape) {
            newStyleAttributes['textAlign'] = 'center'
            newStyleAttributes['shape'] = nodeData.shape

            if (newStyleAttributes['shape'] === 'centered-rectangle') delete newStyleAttributes['shape']
            if (newStyleAttributes['shape'] === 'oval') newStyleAttributes['shape'] = 'pill'
          }

          node.setData({
            ...nodeData,
            styleAttributes: {
              ...nodeData.styleAttributes,
              ...newStyleAttributes
            }
          })
        }

        for (const edge of canvas.edges.values()) {
          const edgeData = edge.getData()

          // TODO
        }
      }
    ))
  }
}