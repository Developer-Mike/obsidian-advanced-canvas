import App, { SuggestModal } from "obsidian"
import AdvancedCanvasPlugin from "./main"
import SettingsManager, { SETTINGS, AdvancedCanvasPluginSettingsValues } from "./settings"
import { DropdownSetting, Setting, StyleAttributesSetting } from "./@types/Settings"
import { StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"

export default class Quicksettings {
  plugin: AdvancedCanvasPlugin
  private searchSettingModal: SearchKeyValueSettingModal<Setting>

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.searchSettingModal = new SearchSettingsHeaderModal(this.plugin.app, this.plugin.settings)

    this.plugin.addCommand({
      id: 'open-quicksettings',
      name: 'Open Quicksettings',
      callback: async () => this.searchSettingModal.open()
    })
  }
}

type Pair<T> = [key: string, value: T]
abstract class SearchKeyValueSettingModal<T> extends SuggestModal<Pair<T>> {
  settingsManager: SettingsManager

  abstract getSearchTitle(): string
  abstract getAllSuggestions(): Pair<T>[]
  abstract doesSuggestionMatchQuery(key: string, value: T, query: string): boolean
  abstract displaySuggestion(key: string, value: T, el: HTMLElement): void
  abstract onSelectedSuggestion(key: string, value: T): void

  constructor(app: App, settingsManager: SettingsManager) {
    super(app)
    this.settingsManager = settingsManager

    this.setPlaceholder(this.getSearchTitle())
    this.setInstructions([{
        command: '↑↓',
        purpose: 'to navigate'
    }, {
        command: '↵',
        purpose: 'to edit'
    }, {
        command: 'esc',
        purpose: 'to dismiss'
    }])
  }

  getSuggestions(query: string): Pair<T>[] {
    const suggestions = this.getAllSuggestions()
      .filter(([settingKey, _settingValue]) => this.doesSuggestionMatchQuery(settingKey, _settingValue, query))

    return suggestions
  }

  renderSuggestion(suggestion: Pair<T>, el: HTMLElement): void {
    this.displaySuggestion(suggestion[0], suggestion[1], el)
  }

  onChooseSuggestion(suggestion: Pair<T>, evt: MouseEvent | KeyboardEvent): void {
    this.onSelectedSuggestion(suggestion[0], suggestion[1])
  }
}

class SearchSettingsHeaderModal extends SearchKeyValueSettingModal<Setting> {
  getSearchTitle(): string {
    return 'Type to search settings...'
  }

  getAllSuggestions(): Pair<Setting>[] {
    return Object.entries(SETTINGS).flatMap(([_key, value]) => 
      Object.entries(value.children)
        .filter(([_key, value]) => value.type !== 'button')
    )
  }

  doesSuggestionMatchQuery(key: string, value: Setting, query: string): boolean {
    return key.toLowerCase().includes(query.toLowerCase()) || 
      value.label.toLowerCase().includes(query.toLowerCase()) ||
      value.description?.toLowerCase()?.includes(query.toLowerCase())
  }

  displaySuggestion(key: string, value: Setting, el: HTMLElement): void {
    el.addClass('quicksettings-suggestion')

    el.createEl('span', {
      cls: 'quicksettings-suggestion-label',
      text: value.label
    })

    el.createEl('span', { 
      cls: 'quicksettings-suggestion-description',
      text: value.description 
    })
  }

  onSelectedSuggestion(key: string, value: Setting): void {
    switch (value.type) {
      case 'styles':
        new SearchStyleAttributesSettingsModal(this.app, this.settingsManager, key, value).open()
        break
      case 'text':
        new SetTextOrNumberSettingModal(this.app, this.settingsManager, key, value).open()
        break
      case 'number':
        new SetTextOrNumberSettingModal(this.app, this.settingsManager, key, value).open()
        break
      case 'boolean':
        new SetBooleanSettingModal(this.app, this.settingsManager, key).open()
        break
      case 'dropdown':
        new SetDropdownSettingModal(this.app, this.settingsManager, key, value as DropdownSetting).open()
        break
      default:
        console.log('Unsupported setting type:', value.type)
        break
    }
  }
}

class SearchStyleAttributesSettingsModal extends SearchKeyValueSettingModal<StyleAttributesSetting> {
  settingsManager: SettingsManager
  settingsKey: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, setting: Setting) {
    super(app, settingsManager)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
  }

  getSearchTitle(): string {
    return 'Type to search style attributes...'
  }

  getAllSuggestions(): Pair<StyleAttributesSetting>[] {
    return Object.entries(SETTINGS).flatMap(([_key, value]) => 
      Object.entries(value.children)
        .filter(([_key, value]) => value.type === 'styles')
    )
  }

  doesSuggestionMatchQuery(key: string, value: StyleAttributesSetting, query: string): boolean {
    return key.toLowerCase().includes(query.toLowerCase()) || 
      value.label.toLowerCase().includes(query.toLowerCase()) ||
      value.description?.toLowerCase()?.includes(query.toLowerCase())
  }

  displaySuggestion(key: string, value: StyleAttributesSetting, el: HTMLElement): void {
    el.addClass('quicksettings-suggestion')

    el.createEl('span', {
      cls: 'quicksettings-suggestion-label',
      text: value.label
    })

    el.createEl('span', { 
      cls: 'quicksettings-suggestion-description',
      text: value.description 
    })
  }

  onSelectedSuggestion(key: string, value: StyleAttributesSetting): void {
    const styleAttributes = value.getParameters(this.settingsManager)
    new SearchStyleAttributeSettingsModal(this.app, this.settingsManager, this.settingsKey, key, styleAttributes).open()
  }
}

// TODO
class SearchStyleAttributeSettingsModal extends SearchKeyValueSettingModal<StyleAttribute> {
  settingsManager: SettingsManager
  settingsKey: string
  styleAttributeKey: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, styleAttributeKey: string, styleAttributes: StyleAttribute[]) {
    super(app, settingsManager)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.styleAttributeKey = styleAttributeKey
  }

  getSearchTitle(): string {
    return 'Type to search style attribute values...'
  }

  getAllSuggestions(): Pair<StyleAttribute>[] {
    // styleattributesetting.getParameters(this.settingsManager)
    return (this.settingsManager.getSetting(this.settingsKey as keyof AdvancedCanvasPluginSettingsValues) as StyleAttribute[])
      .map((value, index) => [index.toString(), value])
  }

  doesSuggestionMatchQuery(key: string, value: StyleAttribute, query: string): boolean {
    return key.toLowerCase().includes(query.toLowerCase()) || 
      value.label.toLowerCase().includes(query.toLowerCase())
  }

  displaySuggestion(_key: string, value: StyleAttribute, el: HTMLElement): void {
    el.setText(value.label)
  }

  onSelectedSuggestion(key: string, value: StyleAttribute): void {
    new SetTextOrNumberSettingModal(this.app, this.settingsManager, key, value).open()
  }
}

class SetTextOrNumberSettingModal extends SuggestModal<string> {
  settingsManager: SettingsManager
  settingsKey: string
  setting: Setting

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, setting: Setting) {
    super(app)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.setting = setting

    this.setPlaceholder('Enter new value...')
    this.setInstructions([{
        command: '↑↓',
        purpose: 'to navigate'
    }, {
        command: '↵',
        purpose: 'to edit'
    }, {
        command: 'esc',
        purpose: 'to dismiss'
    }])
  }

  getSuggestions(query: string): string[] {
    if (query.length === 0) return [
      this.settingsManager.getSetting(this.settingsKey as keyof AdvancedCanvasPluginSettingsValues).toString()
    ]

    const value = this.setting.parse ? this.setting.parse(query) : query
    return [value]
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createEl('span', { text: value?.toString() })
  }

  onChooseSuggestion(item: string, _evt: MouseEvent | KeyboardEvent): void {
    this.settingsManager.setSetting({ [this.settingsKey]: this.setting.parse ? this.setting.parse(item) : item })
  }
}

class SetBooleanSettingModal extends SuggestModal<string> {
  settingsManager: SettingsManager
  settingsKey: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string) {
    super(app)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey

    this.setPlaceholder('Enter new value...')
    this.setInstructions([{
        command: '↑↓',
        purpose: 'to navigate'
    }, {
        command: '↵',
        purpose: 'to edit'
    }, {
        command: 'esc',
        purpose: 'to dismiss'
    }])
  }

  getSuggestions(query: string): string[] {
    const currentValue = this.settingsManager.getSetting(this.settingsKey as keyof AdvancedCanvasPluginSettingsValues)
    const suggestions = [currentValue.toString(), (!currentValue).toString()]

    return suggestions.filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createEl('span', { text: value })
  }

  onChooseSuggestion(item: string, _evt: MouseEvent | KeyboardEvent): void {
    this.settingsManager.setSetting({ [this.settingsKey]: item === 'true' })
  }
}

class SetDropdownSettingModal extends SearchKeyValueSettingModal<string> {
  settingsManager: SettingsManager
  settingsKey: string
  setting: DropdownSetting
  currentValue: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, setting: DropdownSetting) {
    super(app, settingsManager)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.setting = setting

    this.currentValue = settingsManager.getSetting(settingsKey as keyof AdvancedCanvasPluginSettingsValues) as string
  }

  getSearchTitle(): string {
    return 'Type to search dropdown values...'
  }

  getAllSuggestions(): Pair<string>[] {
    return [
      [this.currentValue, this.setting.options[this.currentValue]],
      ...Object.entries(this.setting.options).filter(([key, _value]) => key !== this.currentValue)
    ]
  }

  doesSuggestionMatchQuery(key: string, _value: string, query: string): boolean {
    return key.toLowerCase().includes(query.toLowerCase())
  }

  displaySuggestion(_key: string, value: string, el: HTMLElement): void {
    el.createEl('span', { text: value })
  }

  onSelectedSuggestion(key: string, _value: string): void {
    this.settingsManager.setSetting({ [this.settingsKey]: key })
  }
}