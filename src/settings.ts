import { Notice, PluginSettingTab, Setting } from "obsidian"
import AdvancedCanvasPlugin from "./main"

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

  canvasLinksFeatureEnabled: boolean
  showLinksToEmbeddedFiles: boolean
  showLinksBetweenFileNodesInGraph: boolean
  showLinksBetweenFileNodesInProperties: boolean

  shapesFeatureEnabled: boolean

  edgesStylingFeatureEnabled: boolean
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

  stickersFeatureEnabled: boolean

  presentationFeatureEnabled: boolean
  defaultSlideSize: string
  wrapInSlidePadding: number
  useArrowKeysToChangeSlides: boolean
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

  canvasLinksFeatureEnabled: true,
  showLinksToEmbeddedFiles: true,
  showLinksBetweenFileNodesInGraph: true,
  showLinksBetweenFileNodesInProperties: false,

  shapesFeatureEnabled: true,

  edgesStylingFeatureEnabled: true,
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

  collapsibleGroupsFeatureEnabled: false,
  collapsedGroupPreviewOnDrag: true,

  stickersFeatureEnabled: true,

  presentationFeatureEnabled: true,
  defaultSlideSize: '1200x675',
  wrapInSlidePadding: 20,
  useArrowKeysToChangeSlides: true,
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
      "Canvas Links",
      "Treat canvas links similar to markdown links.",
      'canvasLinksFeatureEnabled'
    )

    new Setting(containerEl)
      .setName("Show links to embedded files")
      .setDesc("When enabled, embedded files of file nodes will have a connection to the canvas file in the graph.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('showLinksToEmbeddedFiles'))
          .onChange(async (value) => await this.settingsManager.setSetting({ showLinksToEmbeddedFiles: value }))
      )

    new Setting(containerEl)
      .setName("Show links between file nodes in graph")
      .setDesc("When enabled, edges (arrows) between file nodes will be shown in the graph as connections.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('showLinksBetweenFileNodesInGraph'))
          .onChange(async (value) => await this.settingsManager.setSetting({ showLinksBetweenFileNodesInGraph: value }))
      )

    new Setting(containerEl)
      .setName("Show links between file nodes in properties")
      .setDesc("When enabled, edges (arrows) between file nodes will be shown in the properties of the file nodes. (Automatically shows connections in the graph as well.)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.getSetting('showLinksBetweenFileNodesInProperties'))
          .onChange(async (value) => await this.settingsManager.setSetting({ showLinksBetweenFileNodesInProperties: value }))
      )

    this.createFeatureHeading(
      containerEl,
      "Shapes",
      "Shape your nodes for creating e.g. mind maps or flow charts.",
      'shapesFeatureEnabled'
    )

    this.createFeatureHeading(
      containerEl,
      "Edges styling",
      "Style your edges with different path styles.",
      'edgesStylingFeatureEnabled'
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

    /* Would require a solution to sync the settings with the canvas */
    /*new Setting(containerEl)
      .setName("Disable node interaction")
      .setDesc("When enabled, you can't interact with the nodes when in readonly mode.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.settings.disableNodeInteraction)
          .onChange(async (value) => await this.settingsManager.setSetting({ disableNodeInteraction: value }))
      )

    new Setting(containerEl)
      .setName("Disable node popup menu")
      .setDesc("When enabled, the node popup menu won't show when in readonly mode. (If node interaction is disabled, this setting has no effect.)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.settings.disableNodePopup)
          .onChange(async (value) => await this.settingsManager.setSetting({ disableNodePopup: value }))
      )

    new Setting(containerEl)
      .setName("Disable zoom")
      .setDesc("When enabled, you can't zoom when in readonly mode.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.settings.disableZoom)
          .onChange(async (value) => await this.settingsManager.setSetting({ disableZoom: value }))
      )

    new Setting(containerEl)
      .setName("Disable pan")
      .setDesc("When enabled, you can't pan when in readonly mode.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.settings.disablePan)
          .onChange(async (value) => await this.settingsManager.setSetting({ disablePan: value }))
      )*/

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
      "Stickers",
      "Convert an image node to a sticker by supporting transparency and removing the border.",
      'stickersFeatureEnabled'
    )

    this.createFeatureHeading(
      containerEl,
      "Presentations",
      "Create a presentation from your canvas.",
      'presentationFeatureEnabled'
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
  }

  private createFeatureHeading(containerEl: HTMLElement, label: string, description: string, settingsKey: keyof AdvancedCanvasPluginSettings): Setting {
    return new Setting(containerEl)
      .setHeading()
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
}