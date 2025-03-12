import { parseYaml } from "obsidian"
import AdvancedCanvasPlugin from "src/main"

export default class CssStylesConfigManager<T> {
  private cachedConfig: T[] | null = null
  private configRegex

  constructor(
    private plugin: AdvancedCanvasPlugin,
    trigger: string,
    private validate: (json: Record<string, any>) => T | null
  ) {
    // Regex to match CSS multi-line comments with the @trigger word at the beginning (same line such as /* @trigger \n ... */)
    this.configRegex = new RegExp(`\\/\\*\\s*@${trigger}\\s*\\n([\\s\\S]*?)\\*\\/`, 'g')

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'css-change',
      () => { this.cachedConfig = null }
    ))
  }

  getStyles(): T[] {
    if (this.cachedConfig) return this.cachedConfig

    this.cachedConfig = []
    
    // Parse config from CSS
    const styleSheets = document.styleSheets
    for (let i = 0; i < styleSheets.length; i++) {
      const sheet = styleSheets.item(i)
      if (!sheet) continue
      
      const styleSheetConfigs = this.parseStyleConfigsFromCSS(sheet)
      for (const config of styleSheetConfigs) {
        const validConfig = this.validate(config)
        if (!validConfig) continue

        this.cachedConfig.push(validConfig)
      }
    }

    return this.cachedConfig
  }

  private parseStyleConfigsFromCSS(sheet: CSSStyleSheet): Record<string, any>[] {
		const textContent = sheet?.ownerNode?.textContent?.trim()
		if (!textContent) return []

    const configs = []

    const matches = textContent.matchAll(this.configRegex)
    for (const match of matches) {
      const yamlString = match[1]
      const configYaml = parseYaml(yamlString)

      configs.push(configYaml)
    }

    return configs
  }
}