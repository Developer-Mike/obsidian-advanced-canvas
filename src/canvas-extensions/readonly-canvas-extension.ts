import { Canvas } from "src/types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/events/events"

export default class ReadonlyCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: any) {
    this.plugin = plugin

    if (!this.plugin.settingsManager.settings.betterReadonlyEnabled) return

    /* Register listeners */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas, _node: any) => {
        canvas.menu.menuEl.style.visibility = this.plugin.settingsManager.settings.disableNodePopup ? 'hidden' : 'visible'
      }
    ))

    /* Add settings */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.CanvasChanged,
      (canvas: Canvas) => this.onCanvasChanged(canvas)
    ))
  }

  onCanvasChanged(canvas: Canvas) {
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    CanvasHelper.addQuickSettingsButton(
      settingsContainer,
      this.createToggle(
        'disable-node-interaction', 
        'Disable node interaction', 
        'mouse-pointer-square-dashed', 
        'disableNodeInteraction'
      )
    )

    CanvasHelper.addQuickSettingsButton(
      settingsContainer,
      this.createToggle(
        'disable-node-popup', 
        'Disable node popup', 
        'arrow-up-right-from-circle', 
        'disableNodePopup',
        (state: Boolean) => {
          const menuEl = canvas.menu?.menuEl
          if (!menuEl) return
          
          canvas.menu.menuEl.style.visibility = state ? 'hidden' : 'visible'
        }
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

  private createToggle(id: string, text: string, icon: string, settingKey: string, callback?: (state: Boolean) => void): HTMLElement {
    const toggle = CanvasHelper.createQuickSettingsButton(
      id,
      text,
      icon,
      () => {
        // @ts-expect-error
        const newValue = !this.plugin.settingsManager.settings[settingKey]
        this.plugin.settingsManager.setSetting({ [settingKey]: newValue })
        toggle.dataset.toggled = newValue.toString()

        callback?.call(this, newValue)
      }
    )
    toggle.classList.add('show-while-readonly')

    // @ts-expect-error
    toggle.dataset.toggled = this.plugin.settingsManager.settings[settingKey].toString()

    return toggle
  }
}