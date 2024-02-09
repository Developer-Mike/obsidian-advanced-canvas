import { setIcon, setTooltip } from "obsidian"
import { BBox, Canvas, CanvasNodeData, Position, Size } from "src/@types/Canvas"
import AdvancedCanvasPlugin from "src/main"

export function scaleBBox(bbox: BBox, scale: number): BBox {
  let diffX = (scale - 1) * (bbox.maxX - bbox.minX)
  let diffY = (scale - 1) * (bbox.maxY - bbox.minY)

  return {
    minX: bbox.minX - diffX / 2,
    maxX: bbox.maxX + diffX / 2,
    minY: bbox.minY - diffY / 2,
    maxY: bbox.maxY + diffY / 2
  }
}

export function getBBox(canvasNodeData: CanvasNodeData[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const nodeData of canvasNodeData) {
    minX = Math.min(minX, nodeData.x)
    minY = Math.min(minY, nodeData.y)
    maxX = Math.max(maxX, nodeData.x + nodeData.width)
    maxY = Math.max(maxY, nodeData.y + nodeData.height)
  }

  return { minX, minY, maxX, maxY }
}

export function canvasCommand(plugin: AdvancedCanvasPlugin, check: (canvas: Canvas) => boolean, run: (canvas: Canvas) => void): (checking: boolean) => boolean {
  return (checking: boolean) => {
    const canvas = plugin.getCurrentCanvas()
    if (checking) return canvas !== null && check(canvas)

    if (canvas) run(canvas)

    return true
  }
}

export function createQuickSettingsButton(id: string, label: string, icon: string, callback?: () => void): HTMLElement {
  const quickSetting = document.createElement('div')
  quickSetting.id = id
  quickSetting.classList.add('canvas-control-item')
  setIcon(quickSetting, icon)
  setTooltip(quickSetting, label, { placement: 'left' })
  quickSetting.addEventListener('click', () => callback?.())

  return quickSetting
}

export function addQuickSettingsButton(controlGroup: HTMLElement, element: HTMLElement) {
  controlGroup.querySelector(`#${element.id}`)?.remove()
  controlGroup.appendChild(element)
}

export function createCardMenuOption(canvas: Canvas, id: string, label: string, icon: string, previewNodeSize: () => Size, onPlaced: (canvas: Canvas, pos: Position) => void): HTMLElement {
  const menuOption = document.createElement('div')
  menuOption.id = id
  menuOption.classList.add('canvas-card-menu-button')
  menuOption.classList.add('mod-draggable')
  setIcon(menuOption, icon)
  setTooltip(menuOption, label, { placement: 'top' })

  menuOption.addEventListener('click', (_e) => {
    onPlaced(canvas, getCenterCoordinates(canvas, previewNodeSize()))
  })

  menuOption.addEventListener('pointerdown', (e) => {
    canvas.dragTempNode(e, previewNodeSize(), (pos: Position) => {
      canvas.deselectAll()
      onPlaced(canvas, pos)
    })
  })

  return menuOption
}

export function addCardMenuOption(canvas: Canvas, element: HTMLElement) {
  canvas?.cardMenuEl.querySelector(`#${element.id}`)?.remove()
  canvas?.cardMenuEl.appendChild(element)
}

export function createPopupMenuOption(id: string, label: string, icon: string, callback?: () => void): HTMLElement {
  const menuOption = document.createElement('button')
  menuOption.id = id
  menuOption.classList.add('clickable-icon')
  setIcon(menuOption, icon)
  setTooltip(menuOption, label, { placement: 'top' })
  menuOption.addEventListener('click', () => callback?.())

  return menuOption
}

export function addPopupMenuOption(canvas: Canvas, element: HTMLElement) {
  const popupMenuEl = canvas?.menu?.menuEl
  if (!popupMenuEl) return

  popupMenuEl.querySelector(`#${element.id}`)?.remove()
  popupMenuEl.appendChild(element)
}

export function getCenterCoordinates(canvas: Canvas, nodeSize: Size): Position {
  const viewBounds = canvas.getViewportBBox()

  return { 
    x: (viewBounds.minX + viewBounds.maxX) / 2 - nodeSize.width / 2,
    y: (viewBounds.minY + viewBounds.maxY) / 2 - nodeSize.height / 2,
  }
}

export function zoomToBBox(canvas: Canvas, bbox: BBox) {
  const PADDING_CORRECTION_FACTOR = 1 / 1.1
  const zoomedBBox = scaleBBox(bbox, PADDING_CORRECTION_FACTOR)

  canvas.zoomToBbox(zoomedBBox)
  
  // Calculate zoom factor without clamp
  const scaleFactor = Math.min(
    canvas.canvasRect.width / (bbox.maxX - bbox.minX),
    canvas.canvasRect.height / (bbox.maxY - bbox.minY)
  )

  canvas.tZoom = Math.log2(scaleFactor)
}