interface CustomNode {
  alias: string[]
  className: string
  defaultSize: { width: number, height: number }
  menuName: string
  icon: string
}

const CUSTOM_NODES: CustomNode[] = [
  {
    alias: ['start-end', 'start', 'end', 'oval'],
    className: 'oval-node',
    defaultSize: { width: 150, height: 50 },
    menuName: 'Oval Shaped Card',
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 960 960" width="24">
        <rect rx="300" height="600" width="900" y="180" x="30" stroke-width="75" stroke="var(--text-muted)" fill="transparent"/>
      </svg>
    `,
  },
  {
    alias: ['if', 'diamond'],
    className: 'diamond-node',
    defaultSize: { width: 150, height: 100 },
    menuName: 'Diamond Shaped Card',
    icon: `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
        <g style="transform-origin: 480px -480px;" transform="rotate(45)">
          <path fill="var(--text-muted)"
            d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0 0v-560 560Z" />
        </g>
      </svg>
    `,
  }
]

export default class CanvasModifier {
  plugin: any
  observer: MutationObserver

  constructor(plugin: any) {
    this.plugin = plugin

    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', this.onActiveLeafChange.bind(this)))
    this.onActiveLeafChange()
  }

  destroy() {
    this.observer.disconnect()
  }

  private onActiveLeafChange() {
    const canvas = this.plugin.getCurrentCanvas()
    if (canvas == null) return

    this.observeCanvas(canvas)
    this.updateCustomNodes(canvas)
    this.modifyMenu(canvas)
  }

  private updateCustomNodes(canvas: any) {
    for (const  [_, node] of canvas.nodes) {
      const nodeData = node.getData()

      if (nodeData.type !== 'text') continue
      if (!nodeData.text.startsWith('%%')) continue

      const alias = nodeData.text.split('%%')[1]
      const customNode = CUSTOM_NODES.find((node: CustomNode) => node.alias.includes(alias))
      if (customNode == null) continue

      if (node.nodeEl.classList.contains(customNode.className)) continue
      node.nodeEl.classList.add(customNode.className)
    }
  }

  private observeCanvas(canvas: any) {
    const observe = () => {
      this.observer.observe(canvas.canvasEl, { childList: true, subtree: true, attributes: false })
    }

    this.observer = new MutationObserver((mutations: any) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue
        if (mutation.addedNodes.length === 0) continue

        console.log("ok")

        this.observer.disconnect()
        this.updateCustomNodes(canvas)
        observe()
      }
    })

    observe()
  }

  private modifyMenu(canvas: any) {
    const MORE_MENU_OPTIONS_ID = 'more-menu-options'
    canvas.cardMenuEl.querySelector(`#${MORE_MENU_OPTIONS_ID}`)?.remove()

    const menuButton = document.createElement('div')
    menuButton.id = MORE_MENU_OPTIONS_ID
    menuButton.classList.add('canvas-card-menu-button')
    menuButton.setAttribute('aria-label', 'More node types')
    menuButton.setAttribute('data-tooltip-position', 'top')
    menuButton.addEventListener('click', () => menuButton.classList.toggle('expanded'))
    canvas.cardMenuEl.appendChild(menuButton)

    // DEBUG
    menuButton.classList.add('expanded')

    // Add icon
    menuButton.innerHTML = `
      <svg class="svg-icon lucide-file-image" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
        <g style="transform-origin: 480px -480px;" transform="rotate(180)">
          <path fill="var(--text-muted)"
            d="M600-360ZM320-242q10 1 19.5 1.5t20.5.5q11 0 20.5-.5T400-242v82h400v-400h-82q1-10 1.5-19.5t.5-20.5q0-11-.5-20.5T718-640h82q33 0 56.5 23.5T880-560v400q0 33-23.5 56.5T800-80H400q-33 0-56.5-23.5T320-160v-82Zm40-78q-117 0-198.5-81.5T80-600q0-117 81.5-198.5T360-880q117 0 198.5 81.5T640-600q0 117-81.5 198.5T360-320Zm0-80q83 0 141.5-58.5T560-600q0-83-58.5-141.5T360-800q-83 0-141.5 58.5T160-600q0 83 58.5 141.5T360-400Zm0-200Z" />
        </g>
      </svg>
    `

    // Add popup menu
    const customNodesMenu = document.createElement('div')
    customNodesMenu.classList.add('custom-nodes-menu')
    menuButton.appendChild(customNodesMenu)

    // Add custom nodes
    for (const node of CUSTOM_NODES) {
      const nodeButton = document.createElement('div')
      nodeButton.classList.add('custom-node-button')
      nodeButton.innerHTML = node.icon
      nodeButton.setAttribute('aria-label', node.menuName)
      nodeButton.setAttribute('data-tooltip-position', 'top')
      nodeButton.addEventListener('click', () => this.addCustomNode(canvas, node))

      customNodesMenu.appendChild(nodeButton)
    }
  }

  private addCustomNode(canvas: any, node: CustomNode) {
    const viewBounds = canvas.getViewportBBox()

    const pos = { 
      x: (viewBounds.minX + viewBounds.maxX) / 2 - node.defaultSize.width / 2,
      y: (viewBounds.minY + viewBounds.maxY) / 2 - node.defaultSize.height / 2,
    }
    
    canvas.createTextNode({
      pos: pos,
      size: node.defaultSize,
      text: `%%${node.alias.first()}%%`,
      save: true,
      focus: true,
    })
  }
}