import { Canvas } from "src/types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/events/events"
import { AdvancedCanvasPluginSettings } from "src/settings"

export default class ReadonlyCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: any) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.getSetting('betterReadonlyEnabled')) return

    /* Register listeners */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas, _node: any) => this.updatePopupMenu(canvas)
    ))

    /* Readonly listener */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.ReadonlyChanged,
      (canvas: Canvas, _readonly: boolean) => {
        this.updatePopupMenu(canvas)
      }
    ))

    /* Add settings */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.addQuickSettings(canvas)
    ))
  }

  addQuickSettings(canvas: Canvas) {
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    CanvasHelper.addQuickSettingsButton(
      settingsContainer,
      this.createToggle(
        'disable-node-popup',
        'Disable node popup',
        'arrow-up-right-from-circle',
        'disableNodePopup',
        () => this.updatePopupMenu(canvas)
      )
    )

    CanvasHelper.addQuickSettingsButton(
      settingsContainer,
      this.createToggle(
        'disable-zoom', 
        'Disable zoom', 
        'zoom-in', 
        'disableZoom'
      )
    )

    CanvasHelper.addQuickSettingsButton(
      settingsContainer,
      this.createToggle(
        'disable-pan', 
        'Disable pan', 
        'move', 
        'disablePan'
      )
    )
  }

  private createToggle(id: string, text: string, icon: string, settingKey: keyof AdvancedCanvasPluginSettings, callback?: () => void): HTMLElement {
    const toggle = CanvasHelper.createQuickSettingsButton(
      id,
      text,
      icon,
      () => { (async () => {
        const newValue = !this.plugin.settingsManager.getSetting(settingKey)
        await this.plugin.settingsManager.setSetting({ [settingKey]: newValue })

        toggle.dataset.toggled = this.plugin.settingsManager.getSetting(settingKey).toString()
        callback?.call(this)
      })() }
    )
    toggle.classList.add('show-while-readonly')

    toggle.dataset.toggled = this.plugin.settingsManager.getSetting(settingKey).toString()

    return toggle
  }

  private updatePopupMenu(canvas: Canvas) {
    const hidden = canvas.readonly && this.plugin.settingsManager.getSetting('disableNodePopup')
    canvas.menu.menuEl.style.visibility = hidden ? 'hidden' : 'visible'
  }
}