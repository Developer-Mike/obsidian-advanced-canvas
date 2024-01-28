import { PluginSettingTab, Setting } from "obsidian"
import AdvancedCanvasPlugin from "./main"

const SLIDE_SIZE_OPTIONS: { [key: string]: string } = {
  '1200x675': '16:9',
  '1350x900': '3:2',
}

export interface AdvancedCanvasPluginSettings {
  defaultSlideSize: string
  useArrowKeysToChangeSlides: boolean
  zoomToSlideWithoutPadding: boolean
}

export const DEFAULT_SETTINGS: Partial<AdvancedCanvasPluginSettings> = {
  defaultSlideSize: Object.values(SLIDE_SIZE_OPTIONS).first(),
  useArrowKeysToChangeSlides: true,
  zoomToSlideWithoutPadding: false,
}

export default class AdvancedCanvasSettingsManager {
  plugin: AdvancedCanvasPlugin
  settings: AdvancedCanvasPluginSettings
  settingsTab: AdvancedCanvasPluginSettingTab

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData())
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings)
  }

  addSettingsTab() {
    this.settingsTab = new AdvancedCanvasPluginSettingTab(this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}

export class AdvancedCanvasPluginSettingTab extends PluginSettingTab {
  settingsManager: AdvancedCanvasSettingsManager

  constructor(settingsManager: AdvancedCanvasSettingsManager) {
    super(settingsManager.plugin.app, settingsManager.plugin)
    this.settingsManager = settingsManager
  }

  display(): void {
    let { containerEl } = this
    containerEl.empty()

    new Setting(containerEl)
      .setName("Presentation Settings")

    new Setting(containerEl)
      .setName("Default slize ratio")
      .setDesc("The default ratio of the slide.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(SLIDE_SIZE_OPTIONS)
          .setValue(this.settingsManager.settings.defaultSlideSize)
          .onChange(async (value) => {
            this.settingsManager.settings.defaultSlideSize = value
            await this.settingsManager.saveSettings()
          })
        )

    new Setting(containerEl)
      .setName("Use arrow keys to change slides")
      .setDesc("When enabled, you can use the arrow keys to change slides in presentation mode.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.settings.useArrowKeysToChangeSlides)
          .onChange(async (value) => {
            this.settingsManager.settings.useArrowKeysToChangeSlides = value
            await this.settingsManager.saveSettings()
          })
      )

    new Setting(containerEl)
      .setName("Zoom to slide without padding")
      .setDesc("When enabled, the canvas will zoom to the slide without padding.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsManager.settings.zoomToSlideWithoutPadding)
          .onChange(async (value) => {
            this.settingsManager.settings.zoomToSlideWithoutPadding = value
            await this.settingsManager.saveSettings()
          })
      )
  }
}