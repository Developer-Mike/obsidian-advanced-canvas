import App, { SuggestModal } from "obsidian"
import AdvancedCanvasPlugin from "./main"
import SettingsManager, { SETTINGS, AdvancedCanvasPluginSettingsValues, DEFAULT_SETTINGS_VALUES } from "./settings"
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

type KeyValuePair<T> = [key: string, value: T]
abstract class SearchKeyValueSettingModal<T> extends SuggestModal<KeyValuePair<T>> {
  settingsManager: SettingsManager

  abstract getSearchTitle(): string
  abstract getAllSuggestions(): KeyValuePair<T>[]
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

  getSuggestions(query: string): KeyValuePair<T>[] {
    const suggestions = this.getAllSuggestions()
      .filter(([settingKey, _settingValue]) => this.doesSuggestionMatchQuery(settingKey, _settingValue, query))

    return suggestions
  }

  renderSuggestion(suggestion: KeyValuePair<T>, el: HTMLElement): void {
    this.displaySuggestion(suggestion[0], suggestion[1], el)
  }

  onChooseSuggestion(suggestion: KeyValuePair<T>, evt: MouseEvent | KeyboardEvent): void {
    this.onSelectedSuggestion(suggestion[0], suggestion[1])
  }
}

class SearchSettingsHeaderModal extends SearchKeyValueSettingModal<Setting> {
  getSearchTitle(): string {
    return 'Type to search settings...'
  }

  getAllSuggestions(): KeyValuePair<Setting>[] {
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
        new SearchStyleAttributeModal(this.app, this.settingsManager, key, value).open()
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

class SearchStyleAttributeModal extends SearchKeyValueSettingModal<StyleAttribute> {
  settingsManager: SettingsManager
  settingsKey: string
  setting: StyleAttributesSetting

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, setting: Setting) {
    super(app, settingsManager)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.setting = setting as StyleAttributesSetting
  }

  getSearchTitle(): string {
    return 'Type to search style attributes...'
  }

  getAllSuggestions(): KeyValuePair<StyleAttribute>[] {
    return this.setting.getParameters(this.settingsManager)
      .map(styleAttribute => [styleAttribute.datasetKey, styleAttribute])
  }

  doesSuggestionMatchQuery(key: string, value: StyleAttribute, query: string): boolean {
    return key.toLowerCase().includes(query.toLowerCase()) || 
      value.label.toLowerCase().includes(query.toLowerCase())
  }

  displaySuggestion(key: string, value: StyleAttribute, el: HTMLElement): void {
    el.createEl('span', { text: value.label })
  }

  onSelectedSuggestion(key: string, value: StyleAttribute): void {
    new SetStyleAttributeModal(this.app, this.settingsManager, this.settingsKey, key, value).open()
  }
}

class SetStyleAttributeModal extends SearchKeyValueSettingModal<string> {
  settingsManager: SettingsManager
  settingsKey: string
  styleAttributeKey: string
  styleAttribute: StyleAttribute
  currentValueKey: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, styleAttributeKey: string, styleAttribute: StyleAttribute) {
    super(app, settingsManager)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.styleAttributeKey = styleAttributeKey
    this.styleAttribute = styleAttribute
    this.currentValueKey = (settingsManager.getSetting(settingsKey as keyof AdvancedCanvasPluginSettingsValues) as Record<string, string>)[styleAttributeKey]
  }

  getSearchTitle(): string {
    return 'Set style attribute value...'
  }

  getAllSuggestions(): KeyValuePair<string>[] {
    return this.styleAttribute.options.map(option => [option.value, option.label] as KeyValuePair<string>)
  }

  doesSuggestionMatchQuery(key: string, value: string, query: string): boolean {
    return key?.toLowerCase().includes(query.toLowerCase()) || 
      value.toLowerCase().includes(query.toLowerCase())
  }

  displaySuggestion(_key: string, value: string, el: HTMLElement): void {
    el.setText(value)
  }

  onSelectedSuggestion(key: string, value: string): void {
    this.settingsManager.setSetting({ [this.settingsKey]: {
      ...this.settingsManager.getSetting(this.settingsKey as keyof AdvancedCanvasPluginSettingsValues) as Record<string, string>,
      [this.styleAttributeKey]: key }
    })
  }
}

class SetTextOrNumberSettingModal extends SuggestModal<string> {
  settingsManager: SettingsManager
  settingsKey: string
  setting: Setting
  defaultValue: string
  currentValue: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, setting: Setting) {
    super(app)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.setting = setting
    this.defaultValue = DEFAULT_SETTINGS_VALUES[settingsKey as keyof AdvancedCanvasPluginSettingsValues].toString()
    this.currentValue = settingsManager.getSetting(settingsKey as keyof AdvancedCanvasPluginSettingsValues).toString()

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
    const parsedInputValue = this.setting.parse ? this.setting.parse(query) : query
    return [...new Set([parsedInputValue, this.currentValue, this.defaultValue])]
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    let text = value
    if (value === this.defaultValue.toString() && value === this.currentValue.toString())
      text = `${value} (default, current)`
    else if (value === this.defaultValue.toString())
      text = `${value} (default)`
    else if (value === this.currentValue.toString())
      text = `${value} (current)`

    el.createEl('span', { text: text })
  }

  onChooseSuggestion(item: string, _evt: MouseEvent | KeyboardEvent): void {
    this.settingsManager.setSetting({ [this.settingsKey]: this.setting.parse ? this.setting.parse(item) : item })
  }
}

class SetBooleanSettingModal extends SuggestModal<string> {
  settingsManager: SettingsManager
  settingsKey: string
  defaultValue: boolean
  currentValue: boolean

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string) {
    super(app)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.defaultValue = DEFAULT_SETTINGS_VALUES[settingsKey as keyof AdvancedCanvasPluginSettingsValues] as boolean
    this.currentValue = settingsManager.getSetting(settingsKey as keyof AdvancedCanvasPluginSettingsValues) as boolean

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
    let text = value
    if (value === this.defaultValue.toString() && value === this.currentValue.toString())
      text = `${value} (default, current)`
    else if (value === this.defaultValue.toString())
      text = `${value} (default)`
    else if (value === this.currentValue.toString())
      text = `${value} (current)`

    el.createEl('span', { text: text })
  }

  onChooseSuggestion(item: string, _evt: MouseEvent | KeyboardEvent): void {
    this.settingsManager.setSetting({ [this.settingsKey]: item === 'true' })
  }
}

class SetDropdownSettingModal extends SearchKeyValueSettingModal<string> {
  settingsManager: SettingsManager
  settingsKey: string
  setting: DropdownSetting
  defaultValueKey: string
  currentValueKey: string

  constructor(app: App, settingsManager: SettingsManager, settingsKey: string, setting: DropdownSetting) {
    super(app, settingsManager)
    this.settingsManager = settingsManager
    this.settingsKey = settingsKey
    this.setting = setting
    this.defaultValueKey = DEFAULT_SETTINGS_VALUES[settingsKey as keyof AdvancedCanvasPluginSettingsValues] as string
    this.currentValueKey = settingsManager.getSetting(settingsKey as keyof AdvancedCanvasPluginSettingsValues) as string
  }

  getSearchTitle(): string {
    return 'Type to search dropdown values...'
  }

  getAllSuggestions(): KeyValuePair<string>[] {
    const suggestions: KeyValuePair<string>[] = [[this.currentValueKey, this.setting.options[this.currentValueKey]]]

    if (this.defaultValueKey !== this.currentValueKey)
      suggestions.push([this.defaultValueKey, this.setting.options[this.defaultValueKey]])

    suggestions.push(...Object.entries(this.setting.options).filter(([key, _value]) => key !== this.currentValueKey && key !== this.defaultValueKey))

    return suggestions
  }

  doesSuggestionMatchQuery(key: string, _value: string, query: string): boolean {
    return key.toLowerCase().includes(query.toLowerCase())
  }

  displaySuggestion(key: string, value: string, el: HTMLElement): void {
    let text = value
    if (key === this.defaultValueKey.toString() && key === this.currentValueKey.toString())
      text = `${value} (default, current)`
    else if (key === this.defaultValueKey.toString())
      text = `${value} (default)`
    else if (key === this.currentValueKey.toString())
      text = `${value} (current)`

    el.createEl('span', { text: text })
  }

  onSelectedSuggestion(key: string, _value: string): void {
    this.settingsManager.setSetting({ [this.settingsKey]: key })
  }
}