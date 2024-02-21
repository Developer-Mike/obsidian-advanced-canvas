import { setIcon, setTooltip } from "obsidian"
import { BBox, Canvas, CanvasNode, CanvasNodeData, Position, Size } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"
import * as BBoxHelper from "src/utils/bbox-helper"

export function canvasCommand(plugin: AdvancedCanvasPlugin, check: (canvas: Canvas) => boolean, run: (canvas: Canvas) => void): (checking: boolean) => boolean {
  return (checking: boolean) => {
    const canvas = plugin.getCurrentCanvas()
    if (checking) return canvas !== null && check(canvas)

    if (canvas) run(canvas)

    return true
  }
}

export interface MenuOption {
  id?: string
  label: string
  icon: string
  callback?: () => void
}

export function createQuickSettingsButton(menuOption: MenuOption): HTMLElement {
  const quickSetting = document.createElement('div')
  if (menuOption.id) quickSetting.id = menuOption.id
  quickSetting.classList.add('canvas-control-item')
  setIcon(quickSetting, menuOption.icon)
  setTooltip(quickSetting, menuOption.label, { placement: 'left' })
  quickSetting.addEventListener('click', () => menuOption.callback?.())

  return quickSetting
}

export function addQuickSettingsButton(controlGroup: HTMLElement, element: HTMLElement) {
  if (element.id) controlGroup.querySelector(`#${element.id}`)?.remove()
  controlGroup.appendChild(element)
}

export function createCardMenuOption(canvas: Canvas, menuOption: MenuOption, previewNodeSize: () => Size, onPlaced: (canvas: Canvas, pos: Position) => void): HTMLElement {
  const menuOptionElement = document.createElement('div')
  if (menuOption.id) menuOptionElement.id = menuOption.id
  menuOptionElement.classList.add('canvas-card-menu-button')
  menuOptionElement.classList.add('mod-draggable')
  setIcon(menuOptionElement, menuOption.icon)
  setTooltip(menuOptionElement, menuOption.label, { placement: 'top' })

  menuOptionElement.addEventListener('click', (_e) => {
    onPlaced(canvas, getCenterCoordinates(canvas, previewNodeSize()))
  })

  menuOptionElement.addEventListener('pointerdown', (e) => {
    canvas.dragTempNode(e, previewNodeSize(), (pos: Position) => {
      canvas.deselectAll()
      onPlaced(canvas, pos)
    })
  })

  return menuOptionElement
}

export function addCardMenuOption(canvas: Canvas, element: HTMLElement) {
  if (element.id) canvas?.cardMenuEl.querySelector(`#${element.id}`)?.remove()
  canvas?.cardMenuEl.appendChild(element)
}

export function createPopupMenuOption(menuOption: MenuOption): HTMLElement {
  const menuOptionElement = document.createElement('button')
  if (menuOption.id) menuOptionElement.id = menuOption.id
  menuOptionElement.classList.add('clickable-icon')
  setIcon(menuOptionElement, menuOption.icon)
  setTooltip(menuOptionElement, menuOption.label, { placement: 'top' })
  menuOptionElement.addEventListener('click', () => menuOption.callback?.())

  return menuOptionElement
}

export function createExpandablePopupMenuOption(menuOption: MenuOption, subMenuOptions: MenuOption[]): HTMLElement {
  const menuOptionElement = createPopupMenuOption({
    ...menuOption,
    callback: () => {
      const submenuId = `${menuOption.id}-submenu`

      if (menuOptionElement.classList.contains('is-active')) {
        menuOptionElement.classList.remove('is-active')
        menuOptionElement.parentElement?.querySelector(`#${submenuId}`)?.remove()
        return
      }

      menuOptionElement.classList.add('is-active')

      // Add popup menu
      const submenu = document.createElement('div')
      submenu.id = submenuId
      submenu.classList.add('canvas-submenu')
    
      // Add nested options
      for (const subMenuOption of subMenuOptions) {
        const subMenuOptionElement = createPopupMenuOption(subMenuOption)
        submenu.appendChild(subMenuOptionElement)
      }

      menuOptionElement.parentElement?.appendChild(submenu)
    }
  })

  return menuOptionElement
}

export function addPopupMenuOption(canvas: Canvas, element: HTMLElement, index: number = -1) {
  const popupMenuEl = canvas?.menu?.menuEl
  if (!popupMenuEl) return

  if (element.id) popupMenuEl.querySelector(`#${element.id}`)?.remove()

  const sisterElement = index >= 0 ? popupMenuEl.children[index] : popupMenuEl.children[popupMenuEl.children.length + index]
  popupMenuEl.insertAfter(element, sisterElement)
}

export function getCenterCoordinates(canvas: Canvas, nodeSize: Size): Position {
  const viewBounds = canvas.getViewportBBox()

  return { 
    x: (viewBounds.minX + viewBounds.maxX) / 2 - nodeSize.width / 2,
    y: (viewBounds.minY + viewBounds.maxY) / 2 - nodeSize.height / 2,
  }
}

export function getBBox(canvasNodes: (CanvasNode|CanvasNodeData)[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of canvasNodes) {
    const nodeData = node.getData ? node.getData() : node

    minX = Math.min(minX, nodeData.x)
    minY = Math.min(minY, nodeData.y)
    maxX = Math.max(maxX, nodeData.x + nodeData.width)
    maxY = Math.max(maxY, nodeData.y + nodeData.height)
  }

  return { minX, minY, maxX, maxY }
}

export function zoomToBBox(canvas: Canvas, bbox: BBox) {
  const PADDING_CORRECTION_FACTOR = 1 / 1.1
  const zoomedBBox = BBoxHelper.scaleBBox(bbox, PADDING_CORRECTION_FACTOR)

  canvas.zoomToBbox(zoomedBBox)
  
  // Calculate zoom factor without clamp
  const scaleFactor = Math.min(
    canvas.canvasRect.width / (bbox.maxX - bbox.minX),
    canvas.canvasRect.height / (bbox.maxY - bbox.minY)
  )

  canvas.tZoom = Math.log2(scaleFactor)
}