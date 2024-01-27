import AdvancedCanvasPlugin from "./main";

export default class CommandHelper {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.plugin.addCommand({
			id: 'export-transparent-svg',
			name: 'Advanced Canvas: Export Transparent SVG',
			checkCallback: (checking: boolean) => {
        const canvas = this.plugin.getCurrentCanvas()
        if (checking) return canvas != null

        console.log(canvas)
      }
		})
  }
}