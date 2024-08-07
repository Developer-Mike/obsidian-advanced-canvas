import App, { Modal, Setting } from "obsidian"
import { Canvas } from "src/@types/Canvas"
import { CanvasEvent } from "src/core/events"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "../core/canvas-extension"

export default class PropertiesCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  private onCanvasChanged(canvas: Canvas) {
    this.updateCssClasses(canvas)

    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    CanvasHelper.addControlMenuButton(
      settingsContainer,
      CanvasHelper.createControlMenuButton({
        id: 'properties',
        label: 'Properties',
        icon: 'settings-2',
        callback: () => this.openPropertiesDialog(canvas)
      })
    )
  }

  private previousCssclasses: string[] = []
  private updateCssClasses(canvas: Canvas) {
    this.previousCssclasses.forEach((cssclass) => {
      canvas.wrapperEl.classList.remove(cssclass)
    })

    this.previousCssclasses = canvas.metadata?.properties?.cssclasses || []
    this.previousCssclasses.forEach((cssclass) => {
      canvas.wrapperEl.classList.add(cssclass)
    })
  }

  private async openPropertiesDialog(canvas: Canvas) {
    await new PropertiesModal(this.plugin.app, canvas).awaitDialog()
    this.updateCssClasses(canvas)
  }
}

class PropertiesModal extends Modal {
  canvas: Canvas

  constructor(app: App, canvas: Canvas) {
    super(app)
    this.canvas = canvas
  }

  onOpen() {
    new Setting(this.contentEl)
    .setHeading()
    .setName("Properties")

    new Setting(this.contentEl)
      .setClass("properties-field")
      .setName("cssclasses")
      .setTooltip("Add classes to the canvas wrapper element. Separate multiple classes with spaces.")
      .addText((text) =>
        text
          .setValue(this.canvas.metadata.properties?.cssclasses?.join(' '))
          .onChange((value) => {
            this.canvas.metadata.properties = this.canvas.metadata?.properties ?? {}
            this.canvas.metadata.properties.cssclasses = value.split(' ')
          })
      )
  }

  onClose() {}

  awaitDialog(): Promise<void> {
    return new Promise((resolve) => {
      this.onClose = () => {
        this.contentEl.empty()
        resolve()
      }

      this.open()
    })
  }
}