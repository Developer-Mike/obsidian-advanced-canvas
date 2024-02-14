import { ItemView, Plugin } from 'obsidian'
import AdvancedCanvasSettingsManager from './settings'
import ShapesCanvasExtension from './canvas-extensions/shapes-canvas-extension'
import { Canvas, CanvasView } from './@types/Canvas'
import CanvasEventEmitter from './events/canvas-event-emitter'
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
import EdgesStyleCanvasExtension from './canvas-extensions/edges-style-canvas-extension'
import EdgeDataTaggerCanvasExtension from './canvas-extensions/edge-data-tagger-canvas-extension'

const CANVAS_EXTENSIONS: any[] = [
  NodeDataTaggerCanvasExtension,
  EdgeDataTaggerCanvasExtension,
  InteractionTaggerCanvasExtension,
  CommandsCanvasExtension,
  ReadonlyCanvasExtension,
  GroupCanvasExtension,
  EncapsulateCanvasExtension,
  StickersCanvasExtension,
  ShapesCanvasExtension,
  EdgesStyleCanvasExtension,
  PresentationCanvasExtension,
  PortalsCanvasExtension
]

export default class AdvancedCanvasPlugin extends Plugin {
  settingsManager: AdvancedCanvasSettingsManager
  canvasEventEmitter: CanvasEventEmitter
  canvasExtensions: any[]

	async onload() {
    IconsHelper.addIcons()
    
    this.settingsManager = new AdvancedCanvasSettingsManager(this)
    await this.settingsManager.loadSettings()
    this.settingsManager.addSettingsTab()

    this.canvasEventEmitter = new CanvasEventEmitter(this)
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
}