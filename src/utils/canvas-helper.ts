import { addIcon, setIcon, setTooltip } from "obsidian"
import { BBox, Canvas, CanvasNode, CanvasNodeData, Position, Size } from "src/@types/Canvas"
import { StylableAttribute } from "src/canvas-extensions/advanced-styles/style-settings"
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

export function createStyleDropdownMenu(canvas: Canvas, stylableAttributes: StylableAttribute[], currentStyleAttributes: { [key: string]: string | null }, setStyleAttribute: (attribute: StylableAttribute, value: string | null) => void) {
  const STYLE_MENU_ID = 'style-menu'
  const STYLE_MENU_DROPDOWN_ID = 'style-menu-dropdown'
  const STYLE_MENU_DROPDOWN_SUBMENU_ID = 'style-menu-dropdown-submenu'

  // Check if popup menu exists
  const popupMenuElement = canvas?.menu?.menuEl
  if (!popupMenuElement) return
  
  // Remove previous style menu
  popupMenuElement.querySelector(`#${STYLE_MENU_ID}`)?.remove()

  const styleMenuButtonElement = document.createElement('button')
  styleMenuButtonElement.id = STYLE_MENU_ID
  styleMenuButtonElement.classList.add('clickable-icon')

  setIcon(styleMenuButtonElement, 'paintbrush')
  setTooltip(styleMenuButtonElement, 'Style', { placement: 'top' })
  
  // Add style menu to popup menu
  popupMenuElement.appendChild(styleMenuButtonElement)

  // Add click event
  styleMenuButtonElement.addEventListener('click', () => {
    const isOpen = styleMenuButtonElement.classList.toggle('has-active-menu')
    if (!isOpen) {
      popupMenuElement.querySelector(`#${STYLE_MENU_DROPDOWN_ID}`)?.remove()
      popupMenuElement.querySelector(`#${STYLE_MENU_DROPDOWN_SUBMENU_ID}`)?.remove()
      
      return
    }

    const styleMenuDropdownElement = document.createElement('div')
    styleMenuDropdownElement.id = STYLE_MENU_DROPDOWN_ID
    styleMenuDropdownElement.classList.add('menu')

    // Position correctly
    styleMenuDropdownElement.style.position = 'absolute'
    styleMenuDropdownElement.style.maxHeight = 'initial'

    styleMenuDropdownElement.style.top = `${popupMenuElement.getBoundingClientRect().height}px`

    const canvasWrapperCenterX = canvas.wrapperEl.getBoundingClientRect().left + canvas.wrapperEl.getBoundingClientRect().width / 2

    const leftPosition = styleMenuButtonElement.getBoundingClientRect().left - popupMenuElement.getBoundingClientRect().left
    const rightPosition = popupMenuElement.getBoundingClientRect().right - styleMenuButtonElement.getBoundingClientRect().right

    // Swap sides if it is too close to the edge
    if (popupMenuElement.getBoundingClientRect().left + leftPosition < canvasWrapperCenterX)
      styleMenuDropdownElement.style.left = `${leftPosition}px`
    else styleMenuDropdownElement.style.right = `${rightPosition}px`

    // Add style options
    for (const stylableAttribute of stylableAttributes) {
      const stylableAttributeElement = document.createElement('div')
      stylableAttributeElement.classList.add('menu-item')
      stylableAttributeElement.classList.add('tappable')

      // Add icon
      const iconElement = document.createElement('div')
      iconElement.classList.add('menu-item-icon')

      const selectedStyle = stylableAttribute.options
        .find(option => currentStyleAttributes[stylableAttribute.datasetKey] === option.value) ??
        stylableAttribute.options.find(value => value.value === null)!!
      setIcon(iconElement, selectedStyle.icon)

      stylableAttributeElement.appendChild(iconElement)

      // Add label
      const labelElement = document.createElement('div')
      labelElement.classList.add('menu-item-title')
      labelElement.textContent = stylableAttribute.label
      stylableAttributeElement.appendChild(labelElement)

      // Add expand icon
      const expandIconElement = document.createElement('div')
      expandIconElement.classList.add('menu-item-icon')
      setIcon(expandIconElement, 'chevron-right')
      stylableAttributeElement.appendChild(expandIconElement)

      // Append to dropdown
      styleMenuDropdownElement.appendChild(stylableAttributeElement)

      // Add hover effect
      stylableAttributeElement.addEventListener('pointerenter', () => {
        stylableAttributeElement.classList.add('selected')
      })

      stylableAttributeElement.addEventListener('pointerleave', () => {
        stylableAttributeElement.classList.remove('selected')
      })

      // Add click event
      stylableAttributeElement.addEventListener('click', () => {
        // Remove previous submenu
        popupMenuElement.querySelector(`#${STYLE_MENU_DROPDOWN_SUBMENU_ID}`)?.remove()

        const styleMenuDropdownSubmenuElement = document.createElement('div')
        styleMenuDropdownSubmenuElement.id = STYLE_MENU_DROPDOWN_SUBMENU_ID
        styleMenuDropdownSubmenuElement.classList.add('menu')
    
        // Position correctly
        styleMenuDropdownSubmenuElement.style.position = 'absolute'
        styleMenuDropdownSubmenuElement.style.maxHeight = 'initial'

        const topOffset = parseFloat(window.getComputedStyle(styleMenuDropdownElement).getPropertyValue('padding-top')) + (styleMenuDropdownElement.offsetHeight - styleMenuDropdownElement.clientHeight) / 2
        styleMenuDropdownSubmenuElement.style.top = `${stylableAttributeElement.getBoundingClientRect().top - topOffset - popupMenuElement.getBoundingClientRect().top}px`

        // Swap sides if it is too close to the edge
        const leftPosition = styleMenuDropdownElement.getBoundingClientRect().right - popupMenuElement.getBoundingClientRect().left
        const rightPosition = popupMenuElement.getBoundingClientRect().right - styleMenuDropdownElement.getBoundingClientRect().left

        // Swap sides if it is too close to the edge
        if (popupMenuElement.getBoundingClientRect().left + leftPosition < canvasWrapperCenterX)
          styleMenuDropdownSubmenuElement.style.left = `${leftPosition}px`
        else styleMenuDropdownSubmenuElement.style.right = `${rightPosition}px`

        // Add style options
        for (const value of stylableAttribute.options) {
          const styleMenuDropdownSubmenuOptionElement = document.createElement('div')
          styleMenuDropdownSubmenuOptionElement.classList.add('menu-item')
          styleMenuDropdownSubmenuOptionElement.classList.add('tappable')

          // Add icon
          const submenuIconElement = document.createElement('div')
          submenuIconElement.classList.add('menu-item-icon')
          setIcon(submenuIconElement, value.icon)
          styleMenuDropdownSubmenuOptionElement.appendChild(submenuIconElement)

          // Add label
          const submenuLabelElement = document.createElement('div')
          submenuLabelElement.classList.add('menu-item-title')
          submenuLabelElement.textContent = value.label
          styleMenuDropdownSubmenuOptionElement.appendChild(submenuLabelElement)

          // Add selected icon
          if (selectedStyle === value) {
            styleMenuDropdownSubmenuOptionElement.classList.add('mod-selected')

            const selectedIconElement = document.createElement('div')
            selectedIconElement.classList.add('menu-item-icon')
            selectedIconElement.classList.add('mod-selected')

            setIcon(selectedIconElement, 'check')
            styleMenuDropdownSubmenuOptionElement.appendChild(selectedIconElement)
          }

          // Add to dropdown submenu
          styleMenuDropdownSubmenuElement.appendChild(styleMenuDropdownSubmenuOptionElement)

          // Add hover effect
          styleMenuDropdownSubmenuOptionElement.addEventListener('pointerenter', () => {
            styleMenuDropdownSubmenuOptionElement.classList.add('selected')
          })

          styleMenuDropdownSubmenuOptionElement.addEventListener('pointerleave', () => {
            styleMenuDropdownSubmenuOptionElement.classList.remove('selected')
          })

          // Add click event
          styleMenuDropdownSubmenuOptionElement.addEventListener('click', () => {
            // Set style attribute
            setStyleAttribute(stylableAttribute, value.value)

            // Keep correct reference
            currentStyleAttributes[stylableAttribute.datasetKey] = value.value

            // Close menu
            styleMenuButtonElement.dispatchEvent(new Event('click'))
          })
        }

        // Append to body
        popupMenuElement.appendChild(styleMenuDropdownSubmenuElement)
      })
    }

    // Append to body
    popupMenuElement.appendChild(styleMenuDropdownElement)
  })
}