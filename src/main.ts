import { ItemView, Plugin } from 'obsidian'
import CanvasPatcher from './core/canvas-patcher'
import { Canvas, CanvasView } from './@types/Canvas'

// Utils
import IconsHelper from './utils/icons-helper'
import DebugHelper from './utils/debug-helper'

// Managers
import SettingsManager from './settings'
import WindowsManager from './windows-manager'

// Canvas Extensions
import CanvasExtension from './core/canvas-extension'
import GroupCanvasExtension from './canvas-extensions/group-canvas-extension'
import PresentationCanvasExtension from './canvas-extensions/presentation-canvas-extension'
import BetterReadonlyCanvasExtension from './canvas-extensions/better-readonly-canvas-extension'
import EncapsulateCanvasExtension from './canvas-extensions/encapsulate-canvas-extension'
import CommandsCanvasExtension from './canvas-extensions/commands-canvas-extension'
import PortalsCanvasExtension from './canvas-extensions/portals-canvas-extension'
import BetterDefaultSettingsCanvasExtension from './canvas-extensions/better-default-settings-canvas-extension'
import ColorPaletteCanvasExtension from './canvas-extensions/color-palette-canvas-extension'
import CollapsibleGroupsCanvasExtension from './canvas-extensions/collapsible-groups-canvas-extension'
import PropertiesCanvasExtension from './canvas-extensions/properties-canvas-extension'
import FocusModeCanvasExtension from './canvas-extensions/focus-mode-canvas-extension'

// Advanced Styles
import NodeStylesExtension from './canvas-extensions/advanced-styles/node-styles'
import EdgeStylesExtension from './canvas-extensions/advanced-styles/edge-styles'

// Dataset Exposers
import NodeInteractionExposerExtension from './canvas-extensions/dataset-exposers/node-interaction-exposer'
import NodeExposerExtension from './canvas-extensions/dataset-exposers/node-exposer'
import EdgeExposerExtension from './canvas-extensions/dataset-exposers/edge-exposer'
import CanvasWrapperExposerExtension from './canvas-extensions/dataset-exposers/canvas-wrapper-exposer'
import MigrationHelper from './utils/migration-helper'
import MetadataCachePatcher from './core/metadata-cache-patcher'

const CANVAS_EXTENSIONS: typeof CanvasExtension[] = [
  // Dataset Exposers
  CanvasWrapperExposerExtension,
  NodeExposerExtension,
  EdgeExposerExtension,
  NodeInteractionExposerExtension,

  // Advanced Styles
  NodeStylesExtension,
  EdgeStylesExtension,

  // Basic Extensions
  BetterDefaultSettingsCanvasExtension,
  CommandsCanvasExtension,
  PropertiesCanvasExtension,
  BetterReadonlyCanvasExtension,
  GroupCanvasExtension,

  // More Advanced Extensions
  CollapsibleGroupsCanvasExtension,
  FocusModeCanvasExtension,
  EncapsulateCanvasExtension,
  ColorPaletteCanvasExtension,
  PresentationCanvasExtension,
  PortalsCanvasExtension
]

export default class AdvancedCanvasPlugin extends Plugin {
  migrationHelper: MigrationHelper
  debugHelper: DebugHelper

  settings: SettingsManager
  windowsManager: WindowsManager

  metadataCachePatcher: MetadataCachePatcher
  canvasPatcher: CanvasPatcher
  canvasExtensions: CanvasExtension[]

	async onload() {
    this.migrationHelper = new MigrationHelper(this)
    await this.migrationHelper.migrate()

    IconsHelper.addIcons()
    
    this.settings = new SettingsManager(this)
    await this.settings.loadSettings()
    this.settings.addSettingsTab()

    this.windowsManager = new WindowsManager(this)

    this.metadataCachePatcher = new MetadataCachePatcher(this)
    this.canvasPatcher = new CanvasPatcher(this)
    this.canvasExtensions = CANVAS_EXTENSIONS.map((Extension: any) => new Extension(this))
	}

  onunload() {}

  getCurrentCanvasView(): CanvasView | null {
    const canvasView = this.app.workspace.getActiveViewOfType(ItemView)
    if (canvasView?.getViewType() !== 'canvas') return null
    return canvasView as CanvasView
  }

  getCurrentCanvas(): Canvas | null {
    return this.getCurrentCanvasView()?.canvas || null
  }

  createFileSnapshot(path: string, content: string) {
    const fileRecoveryPlugin = this.app.internalPlugins.plugins['file-recovery']?.instance
    if (!fileRecoveryPlugin) return

    fileRecoveryPlugin.forceAdd(path, content)
  }

  // this.app.plugins.plugins["advanced-canvas"].enableDebugMode()
  enableDebugMode() {
    if (this.debugHelper) return
    this.debugHelper = new DebugHelper(this)
  }
}