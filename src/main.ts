import { ItemView, Plugin } from 'obsidian'
import SettingsManager from './settings'
import NodeStylesCanvasExtension from './canvas-extensions/node-styles-canvas-extension'
import { Canvas, CanvasView } from './@types/Canvas'
import CanvasPatcher from './core/canvas-patcher'
import GroupCanvasExtension from './canvas-extensions/group-canvas-extension'
import PresentationCanvasExtension from './canvas-extensions/presentation-canvas-extension'
import InteractionTaggerCanvasExtension from './canvas-extensions/interaction-tagger-canvas-extension'
import NodeDataTaggerCanvasExtension from './canvas-extensions/node-data-tagger-canvas-extension'
import ReadonlyCanvasExtension from './canvas-extensions/readonly-canvas-extension'
import EncapsulateCanvasExtension from './canvas-extensions/encapsulate-canvas-extension'
import CommandsCanvasExtension from './canvas-extensions/commands-canvas-extension'
import PortalsCanvasExtension from './canvas-extensions/portals-canvas-extension'
import IconsHelper from './utils/icons-helper'
import StickersCanvasExtension from './canvas-extensions/stickers-canvas-extension'
import EdgeStylesCanvasExtension from './canvas-extensions/edge-styles-canvas-extension'
import EdgeDataTaggerCanvasExtension from './canvas-extensions/edge-data-tagger-canvas-extension'
import DebugHelper from './utils/debug-helper'
import BetterDefaultSettingsCanvasExtension from './canvas-extensions/better-default-settings-canvas-extension'
import ColorPaletteCanvasExtension from './canvas-extensions/color-palette-canvas-extension'
import CollapsibleGroupsCanvasExtension from './canvas-extensions/collapsible-groups-canvas-extension'
import WindowsManager from './windows-manager'
import CanvasWrapperDataTaggerCanvasExtension from './canvas-extensions/canvas-wrapper-data-tagger-canvas-extension'
import PropertiesCanvasExtension from './canvas-extensions/properties-canvas-extension'

const CANVAS_EXTENSIONS: any[] = [
  CanvasWrapperDataTaggerCanvasExtension,
  NodeDataTaggerCanvasExtension,
  EdgeDataTaggerCanvasExtension,
  InteractionTaggerCanvasExtension,
  BetterDefaultSettingsCanvasExtension,
  CommandsCanvasExtension,
  PropertiesCanvasExtension,
  ReadonlyCanvasExtension,
  GroupCanvasExtension,
  CollapsibleGroupsCanvasExtension,
  EncapsulateCanvasExtension,
  ColorPaletteCanvasExtension,
  StickersCanvasExtension,
  NodeStylesCanvasExtension,
  EdgeStylesCanvasExtension,
  PresentationCanvasExtension,
  PortalsCanvasExtension
]

export default class AdvancedCanvasPlugin extends Plugin {
  settings: SettingsManager
  windowsManager: WindowsManager
  debugHelper: DebugHelper

  canvasEventEmitter: CanvasPatcher
  canvasExtensions: any[]

	async onload() {
    IconsHelper.addIcons()
    
    this.settings = new SettingsManager(this)
    await this.settings.loadSettings()
    this.settings.addSettingsTab()

    this.windowsManager = new WindowsManager(this)

    this.canvasEventEmitter = new CanvasPatcher(this)
    this.canvasExtensions = CANVAS_EXTENSIONS.map((Extension) => new Extension(this))
	}

  onunload() {}

  getCurrentCanvasView(): CanvasView|null {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView)
    if (canvasView?.getViewType() !== 'canvas') return null
    return canvasView as CanvasView
  }

  getCurrentCanvas(): Canvas|null {
    return this.getCurrentCanvasView()?.canvas || null
  }

  // this.app.plugins.plugins["advanced-canvas"].enableDebugMode()
  enableDebugMode() {
    if (this.debugHelper) return
    this.debugHelper = new DebugHelper(this)
  }
}