import { Notice, setIcon, setTooltip } from "obsidian"
import { Canvas, CanvasView } from "src/@types/Canvas"
import { CanvasColor } from "src/@types/AdvancedJsonCanvas"
import { CanvasStyleTemplate } from "src/settings"
import CanvasExtension from "./canvas-extension"
import { BUILTIN_NODE_STYLE_ATTRIBUTES } from "./advanced-styles/style-config"

type TemplateKind = 'node' | 'edge'
type PanelState = {
  root: HTMLElement
  panel: HTMLElement
  toggle: HTMLButtonElement
  tab: TemplateKind
  removeOutsideListener: () => void
}

const MAX_TEMPLATES = 5

export default class StyleTemplatesCanvasExtension extends CanvasExtension {
  private panels: Map<Canvas, PanelState>

  isEnabled() { return true }

  init() {
    this.panels = new Map()
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed', (canvas: Canvas) => this.addPanel(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed', (canvas: Canvas) => this.render(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:readonly-changed', (canvas: Canvas) => this.render(canvas)
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:settings-changed', () => {
        for (const [canvas, state] of this.panels) {
          if (this.plugin.settings.getSetting('styleTemplatesPanelPinned')) this.setOpen(state, true)
          this.render(canvas)
        }
      }
    ))
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-view-unloaded:before', (view: CanvasView) => this.removePanel(view.canvas)
    ))
    this.plugin.register(() => {
      for (const canvas of this.panels.keys()) this.removePanel(canvas)
    })
    for (const canvas of this.plugin.getCanvases()) this.addPanel(canvas)
  }

  private addPanel(canvas: Canvas) {
    if (this.panels.get(canvas)?.root.parentElement === canvas.wrapperEl) return
    this.removePanel(canvas)
    const root = canvas.wrapperEl.createDiv({ cls: 'advanced-canvas-style-templates' })
    const toggle = root.createEl('button', { cls: 'clickable-icon advanced-canvas-templates-toggle' })
    this.configureButton(toggle, 'Style templates', 'library')
    const panel = root.createDiv({ cls: 'advanced-canvas-templates-panel' })
    const onOutsidePointer = (event: PointerEvent) => {
      if (!event.composedPath().includes(root) && !this.plugin.settings.getSetting('styleTemplatesPanelPinned'))
        this.setOpen(state, false)
    }
    const doc = canvas.wrapperEl.ownerDocument
    const state: PanelState = { root, panel, toggle, tab: 'node', removeOutsideListener: () => doc.removeEventListener('pointerdown', onOutsidePointer) }
    this.panels.set(canvas, state)
    doc.addEventListener('pointerdown', onOutsidePointer)
    root.addEventListener('pointerdown', event => event.stopPropagation())
    root.addEventListener('click', event => event.stopPropagation())
    toggle.addEventListener('click', () => {
      if (!panel.hidden && this.plugin.settings.getSetting('styleTemplatesPanelPinned')) {
        void this.persist({ styleTemplatesPanelPinned: false })
        this.setOpen(state, false)
      } else {
        this.setOpen(state, panel.hidden)
      }
      this.render(canvas)
    })
    this.setOpen(state, this.plugin.settings.getSetting('styleTemplatesPanelPinned'))
    this.render(canvas)
  }

  private removePanel(canvas: Canvas) {
    const state = this.panels.get(canvas)
    if (!state) return
    state.removeOutsideListener()
    state.root.remove()
    this.panels.delete(canvas)
  }

  private setOpen(state: PanelState, open: boolean) {
    state.panel.hidden = !open
    state.toggle.setAttribute('aria-expanded', String(open))
  }

  private configureButton(button: HTMLButtonElement, label: string, icon: string) {
    button.setAttribute('aria-label', label)
    setIcon(button, icon)
    setTooltip(button, label, { placement: 'top' })
  }

  private iconButton(parent: HTMLElement, label: string, icon: string, action: () => void, disabled = false) {
    const button = parent.createEl('button', { cls: 'clickable-icon' })
    this.configureButton(button, label, icon)
    button.disabled = disabled
    button.addEventListener('click', action)
    return button
  }

  private render(canvas: Canvas) {
    const state = this.panels.get(canvas)
    if (!state || state.panel.hidden) return
    const panel = state.panel
    panel.empty()
    const header = panel.createDiv({ cls: 'advanced-canvas-templates-header' })
    header.createEl('strong', { text: 'Style templates' })
    const pinned = this.plugin.settings.getSetting('styleTemplatesPanelPinned')
    const pin = this.iconButton(header, pinned ? 'Unpin panel' : 'Pin panel', 'pin', () => {
      void this.persist({ styleTemplatesPanelPinned: !pinned })
    })
    pin.setAttribute('aria-pressed', String(pinned))
    this.iconButton(header, 'Close panel', 'x', () => {
      this.setOpen(state, false)
      if (pinned) void this.persist({ styleTemplatesPanelPinned: false })
    })

    const tabs = panel.createDiv({ cls: 'advanced-canvas-templates-tabs' })
    for (const kind of ['node', 'edge'] as const) {
      const tab = tabs.createEl('button', { text: kind === 'node' ? 'Nodes' : 'Edges' })
      tab.setAttribute('aria-pressed', String(state.tab === kind))
      tab.addEventListener('click', () => { state.tab = kind; this.render(canvas) })
    }

    const templates = this.templates(state.tab)
    const selected = this.selected(canvas, state.tab)
    panel.createDiv({
      cls: 'advanced-canvas-templates-hint',
      text: canvas.readonly ? 'Canvas is read-only.' : 'Select one item to save its style, or select items to apply a template.'
    })
    for (let index = 0; index < MAX_TEMPLATES; index++) {
      const template = templates[index]
      const row = panel.createDiv({ cls: 'advanced-canvas-template-row' })
      const input = row.createEl('input', { type: 'text', placeholder: `Template ${index + 1}` })
      input.value = template?.name ?? ''
      input.setAttribute('aria-label', `Template ${index + 1} name`)
      const actions = row.createDiv({ cls: 'advanced-canvas-template-actions' })
      this.iconButton(actions, template ? 'Update from selection' : 'Save selection', 'save', () => {
        const element = this.selected(canvas, state.tab)[0]
        if (!element || canvas.readonly) return
        const data = element.getData()
        const updated: CanvasStyleTemplate = {
          name: input.value.trim() || `Template ${index + 1}`,
          color: data.color || undefined,
          styleAttributes: { ...data.styleAttributes }
        }
        const next = [...this.templates(state.tab)]
        if (index < next.length) next[index] = updated
        else next.push(updated)
        void this.saveTemplates(state.tab, next)
      }, canvas.readonly || selected.length !== 1 || index > templates.length)
      if (!template) continue
      this.iconButton(actions, 'Apply template to selection', 'paintbrush', () => this.apply(canvas, state.tab, template), canvas.readonly || selected.length === 0)
      const isDefault = this.isDefault(state.tab, template)
      const defaultButton = this.iconButton(actions, isDefault ? 'Current default' : 'Set as default', 'star', () => void this.setDefault(state.tab, template))
      defaultButton.setAttribute('aria-pressed', String(isDefault))
      this.iconButton(actions, 'Delete template', 'trash', () => {
        const next = this.templates(state.tab).filter((_, i) => i !== index)
        void this.saveTemplates(state.tab, next)
      })
    }
    const clear = panel.createEl('button', { text: 'Clear default' })
    clear.addEventListener('click', () => void this.clearDefault(state.tab))
  }

  private templates(kind: TemplateKind): CanvasStyleTemplate[] {
    return this.plugin.settings.getSetting(kind === 'node' ? 'nodeStyleTemplates' : 'edgeStyleTemplates')
  }

  private selected(canvas: Canvas, kind: TemplateKind) {
    const items = [...canvas.selection]
    const matching = items.filter(item => (kind === 'node' ? canvas.nodes.get(item.id) : canvas.edges.get(item.id)) === item)
    return matching.length === items.length ? matching : []
  }

  private async saveTemplates(kind: TemplateKind, templates: CanvasStyleTemplate[]) {
    await this.persist(kind === 'node' ? { nodeStyleTemplates: templates } : { edgeStyleTemplates: templates })
  }

  private async persist(data: Parameters<typeof this.plugin.settings.setSetting>[0]) {
    try { await this.plugin.settings.setSetting(data) }
    catch (error) {
      console.error('Failed to save canvas style templates:', error)
      new Notice('Could not save canvas style templates. See the console for details.')
    }
  }

  private isDefault(kind: TemplateKind, template: CanvasStyleTemplate) {
    const settings = this.plugin.settings
    if (kind === 'node' && !settings.getSetting('applyNodeStyleDefaultToAllTypes')) return false
    if (kind === 'edge' && settings.getSetting('inheritEdgeColorFromNode')) return false
    const color = kind === 'node'
      ? settings.getSetting('defaultTextNodeColorOverride') ?? String(settings.getSetting('defaultTextNodeColor'))
      : settings.getSetting('defaultEdgeColorOverride') ?? String(settings.getSetting('defaultEdgeColor'))
    const attributes = kind === 'node' ? settings.getSetting('defaultTextNodeStyleAttributes') : settings.getSetting('defaultEdgeStyleAttributes')
    const normalized = (values: Record<string, string | null>) => JSON.stringify(Object.entries(values).filter(([, value]) => value != null && value !== '').sort(([a], [b]) => a.localeCompare(b)))
    return (template.color ?? '0') === color && normalized(template.styleAttributes) === normalized(attributes)
  }

  private async setDefault(kind: TemplateKind, template: CanvasStyleTemplate) {
    const color = template.color ?? '0'
    const numericColor = /^\d+$/.test(color) ? Number(color) : 0
    const override: CanvasColor | null = color.startsWith('#') ? template.color ?? null : null
    const attributes = { ...template.styleAttributes }
    await this.persist(kind === 'node'
      ? { defaultTextNodeColor: numericColor, defaultTextNodeColorOverride: override, defaultTextNodeStyleAttributes: attributes, applyNodeStyleDefaultToAllTypes: true }
      : { defaultEdgeColor: numericColor, defaultEdgeColorOverride: override, defaultEdgeStyleAttributes: attributes, inheritEdgeColorFromNode: false })
  }

  private async clearDefault(kind: TemplateKind) {
    await this.persist(kind === 'node'
      ? { defaultTextNodeColor: 0, defaultTextNodeColorOverride: null, defaultTextNodeStyleAttributes: {}, applyNodeStyleDefaultToAllTypes: false }
      : { defaultEdgeColor: 0, defaultEdgeColorOverride: null, defaultEdgeStyleAttributes: {} })
  }

  private apply(canvas: Canvas, kind: TemplateKind, template: CanvasStyleTemplate) {
    if (canvas.readonly) return
    const selected = this.selected(canvas, kind)
    if (!selected.length) return
    const styles = [...BUILTIN_NODE_STYLE_ATTRIBUTES, ...this.plugin.settings.getSetting('customNodeStyleAttributes'), ...this.plugin.settings.nodeCssStylesManager.getStyles()]
    for (const item of selected) {
      const node = canvas.nodes.get(item.id)
      const edge = canvas.edges.get(item.id)
      if (kind === 'node' && node === item) {
        const data = node.getData()
        const attributes = Object.fromEntries(Object.entries(template.styleAttributes).filter(([key]) => {
          const definition = styles.find(style => style.key === key)
          return !definition?.nodeTypes || definition.nodeTypes.includes(data.type)
        }))
        node.setData({ ...data, color: template.color, styleAttributes: attributes })
      } else if (kind === 'edge' && edge === item) {
        edge.setData({ ...edge.getData(), color: template.color, styleAttributes: { ...template.styleAttributes } })
      }
    }
    canvas.pushHistory(canvas.getData())
    canvas.requestSave()
  }
}
