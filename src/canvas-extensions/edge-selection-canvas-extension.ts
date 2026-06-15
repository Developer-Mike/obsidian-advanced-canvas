import { Canvas } from "src/@types/Canvas"
import CanvasHelper, { ConnectionDirection, MenuOption } from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const DIRECTION_MENU_MAP: Record<ConnectionDirection, MenuOption> = {
  connected: {
    id: 'select-connected-edges',
    icon: 'arrows-selected',
    label: 'Select Connected Edges',
  },
  outgoing: {
    id: 'select-outgoing-edges',
    icon: 'arrow-right-selected',
    label: 'Select Outgoing Edges',
  },
  incoming: {
    id: 'select-incoming-edges',
    icon: 'arrow-left-selected',
    label: 'Select Incoming Edges',
  },
}

export default class EdgeSelectionCanvasExtension extends CanvasExtension {
  isEnabled() { return 'edgeSelectionEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))
  }

  private onPopupMenuCreated(canvas: Canvas) {
    const popupMenuEl = canvas?.menu?.menuEl
    if (!popupMenuEl) return

    const selectionNodeData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectionNodeData.length === 0) return

    const selectEdgeByDirection = this.plugin.settings.getSetting("selectEdgeByDirection")
    const menuDirectionSet = new Set<ConnectionDirection>(['connected'])

    if (selectionNodeData.length === 1) {
      // for better user experience and performance,
      // reduce unapplicable options for frequent use case
      const node = canvas.nodes.get(selectionNodeData[0].id)
      if (!node) return

      const edges = canvas.getEdgesForNode(node)
      // hide all options if no edges
      if (edges.length === 0) return

      // add options depending on edge types
      if (selectEdgeByDirection) {
        edges.forEach(edge => {
          if (edge.from.node === node) {
            menuDirectionSet.add('outgoing')
          } else if (edge.to.node === node) {
            menuDirectionSet.add('incoming')
          }
        })
      }
    } else if (selectEdgeByDirection) {
      // add all options if multiple nodes selected
      menuDirectionSet.add('outgoing')
      menuDirectionSet.add('incoming')
    }

    menuDirectionSet.forEach(direction => {
      const config = DIRECTION_MENU_MAP[direction]
      CanvasHelper.addPopupMenuOption(canvas, CanvasHelper.createPopupMenuOption({
        ...config,
        callback: () => CanvasHelper.selectEdgesForNodes(canvas, direction)
      }))
    })
  }
}
