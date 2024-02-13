import { Notice, PluginSettingTab, Setting } from "obsidian"
import AdvancedCanvasPlugin from "./main"

const SLIDE_SIZE_OPTIONS: { [key: string]: string } = {
  '1200x675': '16:9',
  '1350x900': '3:2',
}

export interface AdvancedCanvasPluginSettings {
  shapesFeatureEnabled: boolean

  commandsFeatureEnabled: boolean
  zoomToClonedNode: boolean
  cloneNodeMargin: number
  expandNodeStepSize: number

  betterReadonlyEnabled: boolean
  disableNodePopup: boolean
  disableZoom: boolean
  disablePan: boolean

  stickersFeatureEnabled: boolean

  presentationFeatureEnabled: boolean
  defaultSlideSize: string
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
  shapesFeatureEnabled: true,

  commandsFeatureEnabled: true,
  zoomToClonedNode: true,
  cloneNodeMargin: 25,
  expandNodeStepSize: 25,

  betterReadonlyEnabled: true,
  disableNodePopup: false,
  disableZoom: false,
  disablePan: false,

  stickersFeatureEnabled: true,

  presentationFeatureEnabled: true,
  defaultSlideSize: Object.values(SLIDE_SIZE_OPTIONS).first(),
  useArrowKeysToChangeSlides: true,
  zoomToSlideWithoutPadding: true,
  slideTransitionAnimationDuration: 0.5,
  slideTransitionAnimationIntensity: 1.25,

  canvasEncapsulationEnabled: true,

  portalsFeatureEnabled: true,
  maintainClosedPortalSize: true,
  showEdgesIntoDisabledPortals: true
}

export default class AdvancedCanvasSettingsManager {
  private plugin: AdvancedCanvasPlugin
  private settings: AdvancedCanvasPluginSettings
  private settingsTab: AdvancedCanvasPluginSettingTab

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData())
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
  }

  addSettingsTab() {
    this.settingsTab = new AdvancedCanvasPluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}

export class AdvancedCanvasPluginSettingTab extends PluginSettingTab {
  settingsManager: AdvancedCanvasSettingsManager

  constructor(plugin: AdvancedCanvasPlugin, settingsManager: AdvancedCanvasSettingsManager) {
    super(plugin.app, plugin)
    this.settingsManager = settingsManager
  }

  display(): void {
    let { containerEl } = this
    containerEl.empty()

    this.createFeatureHeading(
      containerEl,
      "Shapes",
      "Shape your nodes for creating e.g. mind maps or flow charts.",
      'shapesFeatureEnabled'
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
      .setDesc("When enabled, the node popup menu won't show when in readonly mode. (If node interation is disabled, this setting has no effect.)")
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
      .setName("Default slize ratio")
      .setDesc("The default ratio of the slide.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(SLIDE_SIZE_OPTIONS)
          .setValue(this.settingsManager.getSetting('defaultSlideSize'))
          .onChange(async (value) => await this.settingsManager.setSetting({ defaultSlideSize: value }))
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