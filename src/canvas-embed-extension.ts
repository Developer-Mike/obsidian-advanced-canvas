import AdvancedCanvasPlugin from "./main"

export default class CanvasEmbedExtension {
  plugin: AdvancedCanvasPlugin
  originalFunction: any

  constructor(plugin: any) {
    this.plugin = plugin
    this.originalFunction = this.plugin.app.embedRegistry.embedByExtension.canvas
    console.log('originalFunction', this.originalFunction)
    
    const that = this
    this.plugin.app.embedRegistry.unregisterExtension('canvas')
    this.plugin.app.embedRegistry.registerExtension('canvas', function (target: any, source: any) {
      const embed = that.originalFunction(target, source)
      console.log('embed', embed)
      return embed
    })
  }

  onunload() {
    this.plugin.app.embedRegistry.unregisterExtension('canvas')
    this.plugin.app.embedRegistry.registerExtension('canvas', this.originalFunction)
  }
}