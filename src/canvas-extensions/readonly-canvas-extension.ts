import { Canvas } from "src/@types/Canvas"
import * as CanvasHelper from "src/utils/canvas-helper"
import AdvancedCanvasPlugin from "src/main"
import { CanvasEvent } from "src/events/events"
import { AdvancedCanvasPluginSettings } from "src/settings"
import { patchWorkspaceFunction } from "src/utils/patch-helper"

export default class ReadonlyCanvasExtension {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: any) {
    this.plugin = plugin
    const that = this

    if (!this.plugin.settingsManager.getSetting('betterReadonlyEnabled')) return

    /* Popup listener */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.PopupMenuCreated,
      (canvas: Canvas, _node: any) => this.updatePopupMenu(canvas)
    ))

    /* Zoom and Pan listener */
    let movingToBBox = false

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.ViewportChanged.Before,
      (canvas: Canvas) => {
        // Only allow viewport change once when using zoom to bbox
        if (movingToBBox) {
          movingToBBox = false

          that.updateLockedZoom(canvas)
          that.updateLockedPan(canvas)

          return
        }

        if (!canvas.readonly) return

        if (that.plugin.settingsManager.getSetting('disableZoom')) {
          canvas.zoom = canvas.lockedZoom ?? canvas.zoom
          canvas.tZoom = canvas.lockedZoom ?? canvas.tZoom
        }

        if (that.plugin.settingsManager.getSetting('disablePan')) {
          canvas.x = canvas.lockedX ?? canvas.x
          canvas.tx = canvas.lockedX ?? canvas.tx
          canvas.y = canvas.lockedY ?? canvas.y
          canvas.ty = canvas.lockedY ?? canvas.ty
        }
      }
    ))

    // Allow viewport change when using zoom to bbox
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.ZoomToBbox.Before,
      () => movingToBBox = true
    ))

    /* Readonly listener */
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      CanvasEvent.ReadonlyChanged,
      (canvas: Canvas, _readonly: boolean) => {
        this.updatePopupMenu(canvas)
        this.updateLockedZoom(canvas)
        this.updateLockedPan(canvas)
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
        'disableZoom',
        () => this.updateLockedZoom(canvas)
      )
    )

    CanvasHelper.addQuickSettingsButton(
      settingsContainer,
      this.createToggle(
        'disable-pan', 
        'Disable pan', 
        'move', 
        'disablePan',
        () => this.updateLockedPan(canvas)
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

  private updateLockedZoom(canvas: Canvas) {
    canvas.lockedZoom = canvas.tZoom
  }

  private updateLockedPan(canvas: Canvas) {
    canvas.lockedX = canvas.tx
    canvas.lockedY = canvas.ty
  }
}