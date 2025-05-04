import { ItemView, Plugin } from 'obsidian'
import { Canvas, CanvasView } from './@types/Canvas'

// Utils
import IconsHelper from './utils/icons-helper'
import DebugHelper from './utils/debug-helper'

// Managers
import SettingsManager from './settings'
import WindowsManager from './managers/windows-manager'

// Patchers
import Patcher from './patchers/patcher'
import CanvasPatcher from './patchers/canvas-patcher'
import MetadataCachePatcher from './patchers/metadata-cache-patcher'
import BacklinksPatcher from './patchers/backlinks-patcher'
import OutgoingLinksPatcher from './patchers/outgoing-links-patcher'
import PropertiesPatcher from './patchers/properties-patcher'
import SearchPatcher from './patchers/search-patcher'

// Canvas Extensions
import CanvasExtension from './canvas-extensions/canvas-extension'
import MetadataCanvasExtension from './canvas-extensions/metadata-canvas-extension'
import NodeRatioCanvasExtension from './canvas-extensions/node-ratio-canvas-extension'
import VariableBreakpointCanvasExtension from './canvas-extensions/variable-breakpoint-canvas-extension'
import GroupCanvasExtension from './canvas-extensions/group-canvas-extension'
import PresentationCanvasExtension from './canvas-extensions/presentation-canvas-extension'
import ZOrderingCanvasExtension from './canvas-extensions/z-ordering-canvas-extension'
import BetterReadonlyCanvasExtension from './canvas-extensions/better-readonly-canvas-extension'
import EncapsulateCanvasExtension from './canvas-extensions/encapsulate-canvas-extension'
import CommandsCanvasExtension from './canvas-extensions/commands-canvas-extension'
import AutoResizeNodeCanvasExtension from './canvas-extensions/auto-resize-node-canvas-extension'
import PortalsCanvasExtension from './canvas-extensions/portals-canvas-extension'
import FrontmatterModalCanvasExtension from './canvas-extensions/frontmatter-modal-canvas-extension'
import BetterDefaultSettingsCanvasExtension from './canvas-extensions/better-default-settings-canvas-extension'
import ColorPaletteCanvasExtension from './canvas-extensions/color-palette-canvas-extension'
import CollapsibleGroupsCanvasExtension from './canvas-extensions/collapsible-groups-canvas-extension'
import FocusModeCanvasExtension from './canvas-extensions/focus-mode-canvas-extension'
import FlipEdgeCanvasExtension from './canvas-extensions/flip-edge-canvas-extension'
import ExportCanvasExtension from './canvas-extensions/export-canvas-extension'
import FloatingEdgeCanvasExtension from './canvas-extensions/floating-edge-canvas-extension'

// Advanced Styles
import NodeStylesExtension from './canvas-extensions/advanced-styles/node-styles'
import EdgeStylesExtension from './canvas-extensions/advanced-styles/edge-styles'

// Dataset Exposers
import NodeInteractionExposerExtension from './canvas-extensions/dataset-exposers/node-interaction-exposer'
import NodeExposerExtension from './canvas-extensions/dataset-exposers/node-exposer'
import EdgeExposerExtension from './canvas-extensions/dataset-exposers/edge-exposer'
import CanvasWrapperExposerExtension from './canvas-extensions/dataset-exposers/canvas-wrapper-exposer'

const PATCHERS = [
  CanvasPatcher,
  MetadataCachePatcher,
  BacklinksPatcher,
  OutgoingLinksPatcher,
  PropertiesPatcher,
  SearchPatcher,
]

const CANVAS_EXTENSIONS: typeof CanvasExtension[] = [
  // Advanced JSON Canvas Extensions
  MetadataCanvasExtension,
  NodeStylesExtension,
  EdgeStylesExtension,
  NodeRatioCanvasExtension,
  FloatingEdgeCanvasExtension,
  AutoResizeNodeCanvasExtension,
  CollapsibleGroupsCanvasExtension,
  ColorPaletteCanvasExtension,
  PresentationCanvasExtension,
  PortalsCanvasExtension,
  
  // UI Extensions (Non-savable data)
  CanvasWrapperExposerExtension,
  NodeExposerExtension,
  EdgeExposerExtension,
  NodeInteractionExposerExtension,

  FrontmatterModalCanvasExtension,
  BetterDefaultSettingsCanvasExtension,
  CommandsCanvasExtension,
  BetterReadonlyCanvasExtension,
  GroupCanvasExtension,
  VariableBreakpointCanvasExtension,
  FlipEdgeCanvasExtension,
  ZOrderingCanvasExtension,
  ExportCanvasExtension,
  FocusModeCanvasExtension,
  EncapsulateCanvasExtension,
]

export default class AdvancedCanvasPlugin extends Plugin {
  debugHelper: DebugHelper

  settings: SettingsManager
  windowsManager: WindowsManager

  patchers: Patcher[]
  canvasExtensions: CanvasExtension[]

	async onload() {
    IconsHelper.addIcons()
    
    this.settings = new SettingsManager(this)
    await this.settings.loadSettings()
    this.settings.addSettingsTab()

    this.windowsManager = new WindowsManager(this)

    this.patchers = PATCHERS.map((Patcher: any) => new Patcher(this))
    this.canvasExtensions = CANVAS_EXTENSIONS.map((Extension: any) => {
      try { return new Extension(this) } 
      catch (e) {
        console.error(`Error initializing ${Extension.name}:`, e)
      }
    })
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