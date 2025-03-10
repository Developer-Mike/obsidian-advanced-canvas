import { Canvas } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const CONTROL_MENU_FOCUS_TOGGLE_ID = 'focus-mode-toggle'

export default class FocusModeCanvasExtension extends CanvasExtension {
  isEnabled() { return 'focusModeFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'toggle-focus-mode',
      name: 'Toggle Focus Mode',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas: Canvas) => true,
        (canvas: Canvas) => this.toggleFocusMode(canvas)
      )
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.addControlMenuToggle(canvas)
    ))
  }

  private addControlMenuToggle(canvas: Canvas) {
    const settingsContainer = canvas.quickSettingsButton?.parentElement
    if (!settingsContainer) return

    const controlMenuFocusToggle = CanvasHelper.createControlMenuButton({
      id: CONTROL_MENU_FOCUS_TOGGLE_ID,
      label: 'Focus Mode',
      icon: 'focus',
      callback: () => this.toggleFocusMode(canvas)
    })

    CanvasHelper.addControlMenuButton(settingsContainer, controlMenuFocusToggle)
  }

  private toggleFocusMode(canvas: Canvas) {
    const controlMenuFocusToggle = canvas.quickSettingsButton?.parentElement?.querySelector(`#${CONTROL_MENU_FOCUS_TOGGLE_ID}`) as HTMLElement
    if (!controlMenuFocusToggle) return

    const newValue = controlMenuFocusToggle.dataset.toggled !== 'true'

    canvas.wrapperEl.dataset.focusModeEnabled = newValue.toString()
    controlMenuFocusToggle.dataset.toggled = newValue.toString()
  }
}