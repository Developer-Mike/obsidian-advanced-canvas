import { Canvas, CanvasNode } from 'src/@types/Canvas'
import CanvasExtension from './canvas-extension'
import { Menu } from 'obsidian'
import { AbstractSelectionModal } from 'src/utils/modal-helper'
import CanvasHelper from 'src/utils/canvas-helper'

const NO_RATIO = 'No ratio enforcement'

interface RatioOption {
  /** Full name, used in the selection modal and as the tooltip in the popup menu */
  label: string
  /** Short name, used on the popup menu button */
  text: string
  /** `null` means "no ratio enforcement" */
  ratio: number | null
}

const RATIO_OPTIONS: RatioOption[] = [
  { label: '16:9', text: '16:9', ratio: 16 / 9 },
  { label: '4:3', text: '4:3', ratio: 4 / 3 },
  { label: '3:2', text: '3:2', ratio: 3 / 2 },
  { label: '1:1', text: '1:1', ratio: 1 },
  { label: NO_RATIO, text: 'None', ratio: null }
]

export default class NodeRatioCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'canvas:node-menu',
      (menu: Menu, node: CanvasNode) => this.onNodeMenu(menu, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas, node: CanvasNode) => this.onNodeResized(canvas, node)
    ))
  }

  private onNodeMenu(menu: Menu, node: CanvasNode) {
    if (!this.plugin.settings.getSetting('aspectRatioControlFeatureEnabled')) return

    menu.addItem((item) => {
      item.setTitle('Set Aspect Ratio')
        .setIcon('ratio')
        .onClick(async () => {
          const newRatioString = await new AbstractSelectionModal(this.plugin.app, 'Enter aspect ratio (width:height)', RATIO_OPTIONS.map(option => option.label))
            .awaitInput()

          const selectedOption = RATIO_OPTIONS.find(option => option.label === newRatioString)
          if (selectedOption) {
            this.setNodeRatio(node, selectedOption.ratio)
            return
          }

          // Allow custom ratios that aren't in the list
          const [width, height] = newRatioString.split(':').map(Number)
          if (width && height) this.setNodeRatio(node, width / height)
        })
    })
  }

  private onPopupMenuCreated(canvas: Canvas) {
    if (!this.plugin.settings.getSetting('aspectRatioControlFeatureEnabled')) return

    // If the canvas is readonly or there are multiple/no nodes selected, return
    const selectedNodesData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectedNodesData.length !== 1 || canvas.selection.size > 1) return

    const selectedNode = canvas.nodes.get(selectedNodesData[0].id)
    if (!selectedNode) return

    const currentRatio = selectedNode.getData().ratio ?? null

    const menuOption = CanvasHelper.createExpandablePopupMenuOption({
      id: 'set-aspect-ratio',
      label: 'Set aspect ratio',
      icon: 'ratio'
    }, RATIO_OPTIONS.map(option => ({
      label: option.label,
      icon: 'ratio',
      text: option.text,
      callback: () => {
        this.setNodeRatio(selectedNode, option.ratio)

        // Close the submenu
        menuOption.dispatchEvent(new Event('click'))
      }
    })))

    // Mark the currently enforced ratio once the submenu gets opened
    menuOption.addEventListener('click', () => {
      const submenu = menuOption.parentElement?.querySelector(`#${menuOption.id}-submenu`)
      if (!submenu) return

      const activeIndex = RATIO_OPTIONS.findIndex(option =>
        option.ratio === null ? currentRatio === null : Math.abs(option.ratio - (currentRatio ?? 0)) < 0.001
      )
      if (activeIndex >= 0) submenu.children[activeIndex]?.classList.add('is-active')
    })

    CanvasHelper.addPopupMenuOption(canvas, menuOption)
  }

  private setNodeRatio(node: CanvasNode, ratio: number | null) {
    const nodeData = node.getData()

    // Remove the ratio if the user selected "No ratio enforcement"
    if (ratio === null) {
      node.setData({
        ...nodeData,
        ratio: undefined
      })

      return
    }

    node.setData({
      ...nodeData,
      ratio: ratio
    })

    node.setData({
      ...node.getData(),
      width: nodeData.height * ratio
    })
  }

  private onNodeResized(_canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData()
    if (!nodeData.ratio) return

    const nodeBBox = node.getBBox()
    const nodeSize = {
      width: nodeBBox.maxX - nodeBBox.minX,
      height: nodeBBox.maxY - nodeBBox.minY
    }
    const nodeAspectRatio = nodeSize.width / nodeSize.height

    if (nodeAspectRatio < nodeData.ratio)
      nodeSize.width = nodeSize.height * nodeData.ratio
    else nodeSize.height = nodeSize.width / nodeData.ratio

    node.setData({
      ...nodeData,
      width: nodeSize.width,
      height: nodeSize.height
    })
  }
}
