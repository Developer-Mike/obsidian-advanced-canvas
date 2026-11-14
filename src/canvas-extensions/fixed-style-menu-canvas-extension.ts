import { setIcon, setTooltip } from "obsidian"
import { Canvas, CanvasElement, CanvasView } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./advanced-styles/style-config"

export default class FixedStyleMenuCanvasExtension extends CanvasExtension {
  private menus: Map<Canvas, HTMLElement>

  isEnabled() { return true }

  init() {
    this.menus = new Map()
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed', (canvas: Canvas) => this.addMenu(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed', (canvas: Canvas) => this.refresh(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:readonly-changed', (canvas: Canvas) => this.refresh(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed', (canvas: Canvas, node: CanvasElement) => {
        if (canvas.selection.has(node)) this.refresh(canvas)
      }
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:edge-changed', (canvas: Canvas, edge: CanvasElement) => {
        if (canvas.selection.has(edge)) this.refresh(canvas)
      }
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed', () => {
        for (const canvas of this.menus.keys()) this.refresh(canvas)
      }
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-view-unloaded:before', (view: CanvasView) => this.removeMenu(view.canvas)
    ))
    this.plugin.register(() => {
      for (const menu of this.menus.values()) menu.remove()
      this.menus.clear()
    })
    for (const canvas of this.plugin.getCanvases()) this.addMenu(canvas)
  }

  private addMenu(canvas: Canvas) {
    if (this.menus.get(canvas)?.parentElement === canvas.wrapperEl) {
      this.refresh(canvas)
      return
    }
    this.removeMenu(canvas)
    const root = canvas.wrapperEl.createDiv({ cls: 'advanced-canvas-fixed-style-menu' })
    const button = root.createEl('button', { cls: 'clickable-icon advanced-canvas-style-toggle' })
    button.setAttribute('aria-label', 'Canvas style menu')
    button.setAttribute('aria-expanded', 'false')
    setIcon(button, 'menu')
    setTooltip(button, 'Canvas styles', { placement: 'top' })
    const panel = root.createDiv({ cls: 'advanced-canvas-style-panel' })
    panel.hidden = true
    root.addEventListener('pointerdown', event => event.stopPropagation())
    root.addEventListener('click', event => event.stopPropagation())
    button.addEventListener('click', () => {
      panel.hidden = !panel.hidden
      button.setAttribute('aria-expanded', String(!panel.hidden))
      if (!panel.hidden) this.refresh(canvas)
    })
    this.menus.set(canvas, root)
  }

  private removeMenu(canvas: Canvas) {
    this.menus.get(canvas)?.remove()
    this.menus.delete(canvas)
  }

  private refresh(canvas: Canvas) {
    const panel = this.menus.get(canvas)?.querySelector<HTMLElement>('.advanced-canvas-style-panel')
    if (!panel || panel.hidden) return
    panel.empty()

    if (canvas.readonly) {
      panel.createDiv({ text: 'Styles are unavailable in read-only mode.' })
      return
    }
    const selected = [...canvas.selection]
    const nodes = selected.filter(element => canvas.nodes.get(element.id) === element)
    const edges = selected.filter(element => canvas.edges.get(element.id) === element)
    if (!selected.length || (nodes.length !== selected.length && edges.length !== selected.length)) {
      panel.createDiv({ text: 'Select nodes or edges to edit their styles.' })
      return
    }

    panel.createEl('strong', { text: nodes.length ? 'Node styles' : 'Edge styles' })
    this.addColorField(canvas, panel, selected)

    const enabled = this.plugin.settings.getSetting(nodes.length ? 'nodeStylingFeatureEnabled' : 'edgesStylingFeatureEnabled')
    if (!enabled) return
    const attributes = nodes.length
      ? [...BUILTIN_NODE_STYLE_ATTRIBUTES, ...this.plugin.settings.getSetting('customNodeStyleAttributes'), ...this.plugin.settings.nodeCssStylesManager.getStyles()]
      : [...BUILTIN_EDGE_STYLE_ATTRIBUTES, ...this.plugin.settings.getSetting('customEdgeStyleAttributes'), ...this.plugin.settings.edgeCssStylesManager.getStyles()]
    const nodeTypes = new Set(canvas.getSelectionData().nodes.map(node => node.type))
    for (const attribute of attributes) {
      if (attribute.nodeTypes && !attribute.nodeTypes.some(type => nodeTypes.has(type))) continue
      this.addStyleField(canvas, panel, selected, attribute)
    }
  }

  private addColorField(canvas: Canvas, panel: HTMLElement, selected: CanvasElement[]) {
    const field = panel.createDiv({ cls: 'advanced-canvas-style-field' })
    const label = field.createEl('label', { text: 'Color' })
    const select = field.createEl('select')
    label.appendChild(select)
    const colors = ['', '1', '2', '3', '4', '5', '6']
    const style = canvas.wrapperEl.ownerDocument.defaultView?.getComputedStyle(canvas.wrapperEl.ownerDocument.body)
    for (let i = 7; style?.getPropertyValue(`--canvas-color-${i}`); i++) colors.push(String(i))
    const values = selected.map(element => element.getData().color ?? '')
    const current = values.every(value => value === values[0]) ? values[0] : undefined
    if (current && !colors.includes(current)) colors.push(current)
    if (current === undefined) select.createEl('option', { text: 'Mixed', value: '__mixed' })
    const colorNames = ['Default', 'Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Purple']
    for (const color of colors) {
      const name = color === '' ? colorNames[0] : colorNames[Number(color)] ?? (/^\d+$/.test(color) ? `Color ${color}` : color)
      select.createEl('option', { text: name, value: color })
    }
    select.value = current ?? '__mixed'
    select.addEventListener('change', () => {
      this.setColor(canvas, select.value)
      this.refresh(canvas)
    })

    const custom = field.createEl('input', { type: 'color' })
    custom.setAttribute('aria-label', 'Custom color')
    custom.value = current && /^#[0-9a-f]{6}$/i.test(current) ? current : '#808080'
    custom.addEventListener('change', () => {
      this.setColor(canvas, custom.value)
      this.refresh(canvas)
    })
  }

  private setColor(canvas: Canvas, color: string) {
    if (canvas.readonly || color === '__mixed') return
    for (const item of canvas.selection) item.setColor(color)
    canvas.pushHistory(canvas.getData())
    canvas.requestSave()
  }

  private addStyleField(canvas: Canvas, panel: HTMLElement, selected: CanvasElement[], attribute: StyleAttribute) {
    const field = panel.createDiv({ cls: 'advanced-canvas-style-field' })
    const label = field.createEl('label', { text: attribute.label })
    const select = field.createEl('select')
    label.appendChild(select)
    const applicable = selected.filter(element => {
      const node = canvas.nodes.get(element.id)
      return !attribute.nodeTypes || (node === element && attribute.nodeTypes.includes(node.getData().type))
    })
    const values = applicable.map(element => element.getData().styleAttributes?.[attribute.key] ?? '')
    const current = values.every(value => value === values[0]) ? values[0] : undefined
    if (current === undefined) select.createEl('option', { text: 'Mixed', value: '__mixed' })
    for (const option of attribute.options) select.createEl('option', { text: option.label, value: option.value ?? '' })
    if (current && !attribute.options.some(option => option.value === current))
      select.createEl('option', { text: current, value: current })
    select.value = current ?? '__mixed'
    select.addEventListener('change', () => {
      if (canvas.readonly || select.value === '__mixed') return
      CanvasHelper.setStyleAttributeForSelection(canvas, attribute, select.value || null)
    })
  }
}
