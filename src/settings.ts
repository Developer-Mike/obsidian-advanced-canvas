import { Notice, PluginSettingTab, Setting } from "obsidian"
import AdvancedCanvasPlugin from "./main"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"

const NODE_TYPES_ON_DOUBLE_CLICK = {
  'text': 'Text',
  'file': 'File'
}

export interface AdvancedCanvasPluginSettings {
  nodeTypeOnDoubleClick: string
  defaultTextNodeWidth: number
  defaultTextNodeHeight: number
  defaultFileNodeWidth: number
  defaultFileNodeHeight: number

  performanceOptimizationEnabled: boolean

  nodeStylingFeatureEnabled: boolean
  customNodeStyleAttributes: StyleAttribute[]
  defaultTextNodeStyleAttributes: { [key: string]: string }

  edgesStylingFeatureEnabled: boolean
  customEdgeStyleAttributes: StyleAttribute[]
  defaultEdgeStyleAttributes: { [key: string]: string }
  edgeStyleDirectRotateArrow: boolean
  edgeStylePathfinderGridResolution: number
  edgeStylePathfinderPathLiveUpdate: boolean
  edgeStylePathfinderPathRounded: boolean

  commandsFeatureEnabled: boolean
  zoomToClonedNode: boolean
  cloneNodeMargin: number
  expandNodeStepSize: number

  betterReadonlyEnabled: boolean
  disableNodePopup: boolean
  disableZoom: boolean
  disablePan: boolean

  collapsibleGroupsFeatureEnabled: boolean
  collapsedGroupPreviewOnDrag: boolean

  presentationFeatureEnabled: boolean
  showSetStartNodeInPopup: boolean
  defaultSlideSize: string
  wrapInSlidePadding: number
  useArrowKeysToChangeSlides: boolean
  usePgUpPgDownKeysToChangeSlides: boolean
  zoomToSlideWithoutPadding: boolean
  slideTransitionAnimationDuration: number
  slideTransitionAnimationIntensity: number

  canvasEncapsulationEnabled: boolean

  portalsFeatureEnabled: boolean
  maintainClosedPortalSize: boolean
  showEdgesIntoDisabledPortals: boolean
}

export const DEFAULT_SETTINGS: Partial<AdvancedCanvasPluginSettings> = {
  nodeTypeOnDoubleClick: Object.keys(NODE_TYPES_ON_DOUBLE_CLICK).first(),
  defaultTextNodeWidth: 260,
  defaultTextNodeHeight: 60,
  defaultFileNodeWidth: 400,
  defaultFileNodeHeight: 400,

  performanceOptimizationEnabled: false,

  nodeStylingFeatureEnabled: true,
  customNodeStyleAttributes: [],
  defaultTextNodeStyleAttributes: {},

  edgesStylingFeatureEnabled: true,
  customEdgeStyleAttributes: [],
  defaultEdgeStyleAttributes: {},
  edgeStyleDirectRotateArrow: false,
  edgeStylePathfinderGridResolution: 10,
  edgeStylePathfinderPathLiveUpdate: true,
  edgeStylePathfinderPathRounded: true,

  commandsFeatureEnabled: true,
  zoomToClonedNode: true,
  cloneNodeMargin: 20,
  expandNodeStepSize: 20,

  betterReadonlyEnabled: true,
  disableNodePopup: false,
  disableZoom: false,
  disablePan: false,

  collapsibleGroupsFeatureEnabled: true,
  collapsedGroupPreviewOnDrag: true,

  presentationFeatureEnabled: true,
  showSetStartNodeInPopup: false,
  defaultSlideSize: '1200x675',
  wrapInSlidePadding: 20,
  useArrowKeysToChangeSlides: true,
  usePgUpPgDownKeysToChangeSlides: true,
  zoomToSlideWithoutPadding: true,
  slideTransitionAnimationDuration: 0.5,
  slideTransitionAnimationIntensity: 1.25,

  canvasEncapsulationEnabled: true,

  portalsFeatureEnabled: true,
  maintainClosedPortalSize: true,
  showEdgesIntoDisabledPortals: true
}

export default class SettingsManager {
  static SETTINGS_CHANGED_EVENT = 'advanced-canvas:settings-changed'

  private plugin: AdvancedCanvasPlugin
  private settings: AdvancedCanvasPluginSettings
  private settingsTab: AdvancedCanvasPluginSettingTab

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData())
    this.plugin.app.workspace.trigger(SettingsManager.SETTINGS_CHANGED_EVENT)
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings)
  }

  getSetting<T extends keyof AdvancedCanvasPluginSettings>(key: T): AdvancedCanvasPluginSettings[T] {
    return this.settings[key]
  }

  async setSetting(data: Partial<AdvancedCanvasPluginSettings>) {
    this.settings = Object.assign(this.settings, data)
    await this.saveSettings()
    this.plugin.app.workspace.trigger(SettingsManager.SETTINGS_CHANGED_EVENT)
  }

  addSettingsTab() {
    this.settingsTab = new AdvancedCanvasPluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}

export class AdvancedCanvasPluginSettingTab extends PluginSettingTab {
  settingsManager: SettingsManager

  constructor(plugin: AdvancedCanvasPlugin, settingsManager: SettingsManager) {
    super(plugin.app, plugin)
    this.settingsManager = settingsManager
  }

  display(): void {
    let { containerEl } = this
    containerEl.empty()

    new Setting(containerEl)
      .setHeading()
      .setClass('ac-settings-heading')
      .setName("General")

    new Setting(containerEl)
      .setName("Node type on double click")
      .setDesc("The type of node that will be created when double clicking on the canvas.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(NODE_TYPES_ON_DOUBLE_CLICK)
          .setValue(this.settingsManager.getSetting('nodeTypeOnDoubleClick'))
          .onChange(async (value) => await this.settingsManager.setSetting({ nodeTypeOnDoubleClick: value }))
        )
    
    new Setting(containerEl)
      .setName("Default text node width")
      .setDesc("The default width of a text node.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('defaultTextNodeWidth').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ defaultTextNodeWidth: Math.max(1, parseInt(value)) }))
      )
    
    new Setting(containerEl)
      .setName("Default text node height")
      .setDesc("The default height of a text node.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('defaultTextNodeHeight').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ defaultTextNodeHeight: Math.max(1, parseInt(value)) }))
      )

    new Setting(containerEl)
      .setName("Default file node width")
      .setDesc("The default width of a file node.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('defaultFileNodeWidth').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ defaultFileNodeWidth: Math.max(1, parseInt(value)) }))
      )

    new Setting(containerEl)
      .setName("Default file node height")
      .setDesc("The default height of a file node.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('defaultFileNodeHeight').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ defaultFileNodeHeight: Math.max(1, parseInt(value)) }))
      )

    this.createFeatureHeading(
      containerEl,
      "Performance optimization",
      "Optimize the performance of the canvas (Side effect is some amount of blurriness).",
      'performanceOptimizationEnabled'
    )

    this.createFeatureHeading(
      containerEl,
      "Node styling",
      "Style your nodes with different shapes and borders.",
      'nodeStylingFeatureEnabled'
    )

    new Setting(containerEl)
      .setName("Custom node style settings")
      .setDesc("Add custom style settings for nodes. (Go to GitHub for more information)")
      .addButton((button) =>
        button
          .setButtonText("Open Tutorial")
          .onClick(() => window.open("https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/README.md#custom-styles"))
      )

    const allNodeStyleAttributes = [ ...BUILTIN_NODE_STYLE_ATTRIBUTES, ...this.settingsManager.getSetting('customNodeStyleAttributes') ]
      .filter((setting) => setting.nodeTypes === undefined || setting.nodeTypes?.includes('text'))
    this.createDefaultStylesSection(containerEl, 'Default text node style attributes', 'defaultTextNodeStyleAttributes', allNodeStyleAttributes)

    this.createFeatureHeading(
      containerEl,
      "Edges styling",
      "Style your edges with different path styles.",
      'edgesStylingFeatureEnabled'
    )

    new Setting(containerEl)
      .setName("Custom edge style settings")
      .setDesc("Add custom style settings for edges. (Go to GitHub for more information)")
      .addButton((button) =>
        button
          .setButtonText("Open Tutorial")
          .onClick(() => window.open("https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/README.md#custom-styles"))
      )

    this.createDefaultStylesSection(containerEl, 'Default edge style attributes', 'defaultEdgeStyleAttributes', [ ...BUILTIN_EDGE_STYLE_ATTRIBUTES, ...this.settingsManager.getSetting('customEdgeStyleAttributes') ])

    new Setting(containerEl)
      .setName("Rotate arrow if pathfinding method is \"Direct\"")
      .setDesc("When enabled, the arrow will be rotated to the direction of the edge if the pathfinding method is set to \"Direct\".")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('edgeStyleDirectRotateArrow'))
          .onChange(async (value) => await this.settingsManager.setSetting({ edgeStyleDirectRotateArrow: value }))
      )

    new Setting(containerEl)
      .setName("A* grid resolution")
      .setDesc("The resolution of the grid when using the A* path style. The lower the value, the more precise the path will be. But it will also take longer to calculate.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('edgeStylePathfinderGridResolution').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ edgeStylePathfinderGridResolution: Math.max(5, parseInt(value)) }))
      )

    new Setting(containerEl)
      .setName("Live update A* path")
      .setDesc("When enabled, the A* path style will be updated live while dragging the edge.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('edgeStylePathfinderPathLiveUpdate'))
          .onChange(async (value) => await this.settingsManager.setSetting({ edgeStylePathfinderPathLiveUpdate: value }))
      )

    new Setting(containerEl)
      .setName("A* rounded path")
      .setDesc("When enabled, the A* path style will be rounded.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('edgeStylePathfinderPathRounded'))
          .onChange(async (value) => await this.settingsManager.setSetting({ edgeStylePathfinderPathRounded: value }))
      )

    this.createFeatureHeading(
      containerEl,
      "Extended commands",
      "Add more commands to the canvas.",
      'commandsFeatureEnabled'
    )

    new Setting(containerEl)
      .setName("Zoom to cloned node")
      .setDesc("When enabled, the canvas will zoom to the cloned node.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('zoomToClonedNode'))
          .onChange(async (value) => await this.settingsManager.setSetting({ zoomToClonedNode: value }))
      )

    new Setting(containerEl)
      .setName("Clone node margin")
      .setDesc("The margin between the cloned node and the source node.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('cloneNodeMargin').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ cloneNodeMargin: parseInt(value) }))
      )

    new Setting(containerEl)
      .setName("Expand node step size")
      .setDesc("The step size for expanding the node.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('expandNodeStepSize').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ expandNodeStepSize: parseInt(value) }))
      )

    this.createFeatureHeading(
      containerEl,
      "Better readonly",
      "Improve the readonly mode.",
      'betterReadonlyEnabled'
    )

    this.createFeatureHeading(
      containerEl,
      "Collapsible groups",
      "Group nodes can be collapsed and expanded to keep the canvas organized.",
      'collapsibleGroupsFeatureEnabled'
    )

    new Setting(containerEl)
      .setName("Collapsed group preview on drag")
      .setDesc("When enabled, a group that is collapsed show its border while dragging a node.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('collapsedGroupPreviewOnDrag'))
          .onChange(async (value) => await this.settingsManager.setSetting({ collapsedGroupPreviewOnDrag: value }))
      )

    this.createFeatureHeading(
      containerEl,
      "Presentations",
      "Create a presentation from your canvas.",
      'presentationFeatureEnabled'
    )

    new Setting(containerEl)
    .setName("Show \"Set Start Node\" in node popup")
    .setDesc("If turned off, you can still set the start node using the corresponding command.")
    .addToggle((toggle) =>
      toggle
        .setValue(this.settingsManager.getSetting('showSetStartNodeInPopup'))
        .onChange(async (value) => await this.settingsManager.setSetting({ showSetStartNodeInPopup: value }))
    )

    new Setting(containerEl)
      .setName("Default slide ratio")
      .setDesc("The default ratio of the slide. For example, 16:9 is 1200x675 and 3:2 is 1350x900.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('defaultSlideSize'))
          .onChange(async (value) => await this.settingsManager.setSetting({ defaultSlideSize: value.replace(' ', '') }))
      )

    new Setting(containerEl)
      .setName("Wrap in slide padding")
      .setDesc("The padding of the slide when wrapping the canvas in a slide.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('wrapInSlidePadding').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ wrapInSlidePadding: parseInt(value) }))
      )

    new Setting(containerEl)
      .setName("Use arrow keys to change slides")
      .setDesc("When enabled, you can use the arrow keys to change slides in presentation mode.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('useArrowKeysToChangeSlides'))
          .onChange(async (value) => await this.settingsManager.setSetting({ useArrowKeysToChangeSlides: value }))
      )

    new Setting(containerEl)
      .setName("Use PgUp/PgDown keys to change slides")
      .setDesc("When enabled, you can use the PgUp/PgDown keys to change slides in presentation mode (Makes the presentation mode compatible with most presentation remotes).")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('usePgUpPgDownKeysToChangeSlides'))
          .onChange(async (value) => await this.settingsManager.setSetting({ usePgUpPgDownKeysToChangeSlides: value }))
      )

    new Setting(containerEl)
      .setName("Zoom to slide without padding")
      .setDesc("When enabled, the canvas will zoom to the slide without padding.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('zoomToSlideWithoutPadding'))
          .onChange(async (value) => await this.settingsManager.setSetting({ zoomToSlideWithoutPadding: value }))
      )

    new Setting(containerEl)
      .setName("Slide transition animation duration")
      .setDesc("The duration of the slide transition animation in seconds. Set to 0 to disable the animation.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('slideTransitionAnimationDuration').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ slideTransitionAnimationDuration: parseFloat(value) }))
      )

    new Setting(containerEl)
      .setName("Slide transition animation intensity")
      .setDesc("The intensity of the slide transition animation. The higher the value, the more the canvas will zoom out before zooming in on the next slide.")
      .addText((text) =>
        text
          .setValue(this.settingsManager.getSetting('slideTransitionAnimationIntensity').toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ slideTransitionAnimationIntensity: parseFloat(value) }))
      )

    this.createFeatureHeading(
      containerEl,
      "Canvas encapsulation",
      "Encapsulate a selection of nodes and edges into a new canvas.",
      'canvasEncapsulationEnabled'
    )

    this.createFeatureHeading(
      containerEl,
      "Portals",
      "Create portals to other canvases.",
      'portalsFeatureEnabled'
    )

    new Setting(containerEl)
      .setName("Maintain closed portal size")
      .setDesc("When enabled, closing a portal will change the size of the portal to the original, closed size.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('maintainClosedPortalSize'))
          .onChange(async (value) => await this.settingsManager.setSetting({ maintainClosedPortalSize: value }))
      )

    new Setting(containerEl)
      .setName("Show edges into disabled portals")
      .setDesc("When enabled, edges into disabled portals will be shown by an edge to the portal node.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('showEdgesIntoDisabledPortals'))
          .onChange(async (value) => await this.settingsManager.setSetting({ showEdgesIntoDisabledPortals: value }))
      )

    const kofiButton = document.createElement('a')
    kofiButton.classList.add('kofi-button')
    kofiButton.href = 'https://ko-fi.com/X8X27IA08'
    kofiButton.target = '_blank'

    const kofiImage = document.createElement('img')
    kofiImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABNcAAAGVCAMAAADqnefWAAAA3lBMVEUAAAD/////////////////////////////////////////////////////////////////9fX/7Ozv7+//4uH/2dn/2djf39//zc3/ycj/w8P/wMDPz8//ubj/t7f/r6//qqq/v7//o6P/nZz/m5v/lpb/kZCvr6//ion/h4f/hob/hoX/hIP/gH//fXz/fHv/eXifn5//dXT/cXH/bm7/bm3/a2v/amn/aWj/aGf/ZmX/ZGT/Y2L/YWH/YGCPj4//X19/f39vb29fX19PT08/Pz8vLy8fHx8PDw8AAABHqlbKAAAAEHRSTlMAECAwQFBgcICQoLDA0ODwVOCoyAAALtpJREFUeNrs3Vtvm8oaxnGwMcaYw6uiyKpEpI4i1VIutkTUi0pRZGMMZr7/F9rZK90rTnMwzAFm8PO7X6lW7fw7wxxwAAAAAAAAAAAAAAAAAAAAAAAAAAAAwByu5/kBKLDwPG/uAMCYZotgHRMolkbRKvC9mQMAw5ot1wmBVkkULD3XAYAhLFZomgDhui0wdgPQa75KCQaWrJeeAwBauD4eqI0mCtA2AOVmAYZqI1svMScFUGgWEhggWWHYBqCGuyIwRRouHACQhRloZ0gbgBU87OswULrC6QQATEEnJ1li3y4ABmuTE2IVAaA3DNZMl/gYtAH04WIfrgXSFXa1AXQ2xzKoJUKUDaAbn8AaER60AXQQENgEZQO4COemrIOyASBr0xPhORsAsjY5WEEAQNYmJw2wnw0AWZuaxHcA4G9LAqtFOBIPgH1rk4PJKABOGUxOgj0fAK9cZG0a1hiyAfxfRDANKe7UBcDpqckJMWQDeDYnmBA8ZQNwHBe3407MCkM2uHq4HndyEuxlgyvnEUxP4ABcM1z7PUkR5qJwxXB+aqJSLB/A1cKO3OlaOgDXCYsGE4atbHCdZgQTFuPCSbhGuHRt2lJs+IDrg+Ha5OG+SVDK9bwgWEXP6EwaResg8DznIgzXADvZwBiut1xFCV2QRMFi5ozLJZi+0AGQ4i6CKKXuktD/sm2m3uPByqquWw7C6hdlWW5ZTr1gWRQGNPPDhAQkq7kzkoQEZMWRg1ptfSy3OekSI2wgZLFK6IVFafOpv80BwzRtmmrH6EsIGwzF9cOUZCVL1xna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'

    kofiButton.appendChild(kofiImage)
    containerEl.appendChild(kofiButton)
  }

  private createFeatureHeading(containerEl: HTMLElement, label: string, description: string, settingsKey: keyof AdvancedCanvasPluginSettings): Setting {
    return new Setting(containerEl)
      .setHeading()
      .setClass('ac-settings-heading')
      .setName(label)
      .setDesc(description)
      .addToggle((toggle) =>
        toggle
          .setTooltip("Requires a reload to take effect.")
          .setValue(this.settingsManager.getSetting(settingsKey) as boolean)
          .onChange(async (value) => {
            await this.settingsManager.setSetting({ [settingsKey]: value })
            new Notice("Reload obsidian to apply the changes.")
          })
      )
  }

  private createDefaultStylesSection(containerEl: HTMLElement, label: string, settingsKey: keyof AdvancedCanvasPluginSettings, allStylableAttributes: StyleAttribute[]) {
    const defaultNodeStylesEl = document.createElement('details')
    defaultNodeStylesEl.classList.add('setting-item')

    const defaultNodeStylesSummaryEl = document.createElement('summary')
    defaultNodeStylesSummaryEl.textContent = label
    defaultNodeStylesEl.appendChild(defaultNodeStylesSummaryEl)

    for (const stylableAttribute of allStylableAttributes) {
      new Setting(defaultNodeStylesEl)
        .setName(stylableAttribute.label)
        .addDropdown((dropdown) =>
          dropdown
            .addOptions(Object.fromEntries(stylableAttribute.options.map((option) => [option.value, option.label])))
            .setValue((this.settingsManager.getSetting(settingsKey) as { [key: string]: string })[stylableAttribute.datasetKey] ?? 'null')
            .onChange(async (value) => {
              const newValue = this.settingsManager.getSetting(settingsKey) as { [key: string]: string }

              if (value === 'null') delete newValue[stylableAttribute.datasetKey]
              else newValue[stylableAttribute.datasetKey] = value

              await this.settingsManager.setSetting({
                [settingsKey]: newValue
              })
            })
        )
    }

    containerEl.appendChild(defaultNodeStylesEl)
  }
}