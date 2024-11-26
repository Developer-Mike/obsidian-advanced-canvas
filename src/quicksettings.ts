import App, { SuggestModal } from "obsidian"
import AdvancedCanvasPlugin from "./main"
import SettingsManager, { AdvancedCanvasPluginSettingsValues } from "./settings"

export default class Quicksettings {
  plugin: AdvancedCanvasPlugin
  private searchSettingModal: SearchSettingModal

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.searchSettingModal = new SearchSettingModal(this.plugin.app, this.plugin.settings)

    this.plugin.addCommand({
      id: 'open-quicksettings',
      name: 'Open Quicksettings',
      callback: async () => {
        const [key, value] = await this.searchSettingModal.awaitInput()
        if (!key) return

        this.plugin.settings.setSetting({ [key]: value })
      }
    })
  }
}

export class SearchSettingModal extends SuggestModal<string> {
  settingsManager: SettingsManager

  constructor(app: App, settingsManager: SettingsManager) {
    super(app)

    this.settingsManager = settingsManager

    this.setPlaceholder('Type to search...')
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
    const suggestions = Object.keys(this.settingsManager.SETTINGS)
      .filter(settingKey => settingKey.toLowerCase().includes(query.toLowerCase()))

    return suggestions
  }

  renderSuggestion(path: string, el: HTMLElement) {
    const simplifiedPath = path.replace(/\.md$/, '')
    el.setText(simplifiedPath)
  }

  onChooseSuggestion(_path: string, _evt: MouseEvent | KeyboardEvent) {}

  awaitInput(): Promise<[string | null, any]> {
    return new Promise((resolve, _reject) => {
      this.onChooseSuggestion = (path: string, _evt: MouseEvent | KeyboardEvent) => {
        resolve([null, null])
      }

      this.open()
    })
  }
}