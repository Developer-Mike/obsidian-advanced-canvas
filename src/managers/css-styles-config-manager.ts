import AdvancedCanvasPlugin from "src/main"

export default class CssStylesConfigManager<T> {
  private cachedConfig: T[] | null = null

  constructor(
    private plugin: AdvancedCanvasPlugin,
    private trigger: string,
    private validate: (json: Record<string, any>) => boolean
  ) {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      "css-change",
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
        if (!this.validate(config)) continue
        this.cachedConfig.push(config as T)
      }
    }

    return this.cachedConfig
  }

  private parseStyleConfigsFromCSS(sheet: CSSStyleSheet): Record<string, any>[] {
    return []
  }
}