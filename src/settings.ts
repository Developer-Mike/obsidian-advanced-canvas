import { PluginSettingTab, SettingDefinitionItem, SettingGroupItem } from "obsidian"
import { GET_EDGE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/edge-styles"
import { GET_NODE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/node-styles"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"
import { NodeTemplate } from "./canvas-extensions/node-templates-canvas-extension"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "./canvas-extensions/variable-breakpoint-canvas-extension"
import AdvancedCanvasPlugin from "./main"
import CssStylesConfigManager from "./managers/css-styles-config-manager"

const README_URL = 'https://github.com/Developer-Mike/obsidian-advanced-canvas?tab=readme-ov-file'
const KOFI_PAGE_URL = 'https://ko-fi.com/X8X27IA08'

export type NodeTypesOnDoubleClick = 'text' | 'file'
export type EdgeLineDirection = 'nondirectional' | 'unidirectional' | 'bidirectional'

export interface AdvancedCanvasPluginSettingsValues {
  nodeTypeOnDoubleClick: NodeTypesOnDoubleClick
  alignNewNodesToGrid: boolean
  defaultTextNodeDimensions: [number, number]
  defaultFileNodeDimensions: [number, number]
  minNodeSize: number
  maxNodeWidth: number
  disableFontSizeRelativeToZoom: boolean

  canvasMetadataCompatibilityEnabled: boolean
  enableSingleNodeLinks: boolean
  enableSingleNodePopupReferenceCopy: boolean

  combineCustomStylesInDropdown: boolean

  nodeStylingFeatureEnabled: boolean
  customNodeStyleAttributes: StyleAttribute[]
  defaultTextNodeColor: number
  defaultTextNodeStyleAttributes: { [key: string]: string }
  nodeTemplates: NodeTemplate[]

  edgesStylingFeatureEnabled: boolean
  customEdgeStyleAttributes: StyleAttribute[]
  inheritEdgeColorFromNode: boolean
  defaultEdgeColor: number
  defaultEdgeLineDirection: EdgeLineDirection
  defaultEdgeStyleAttributes: { [key: string]: string }
  edgeStyleUpdateWhileDragging: boolean
  edgeStyleSquarePathRounded: boolean
  edgeStylePathfinderAllowDiagonal: boolean
  edgeStylePathfinderPathRounded: boolean

  variableBreakpointFeatureEnabled: boolean

  zOrderingControlFeatureEnabled: boolean
  zOrderingControlShowOneLayerShiftOptions: boolean

  aspectRatioControlFeatureEnabled: boolean

  commandsFeatureEnabled: boolean
  zoomToClonedNode: boolean
  cloneNodeMargin: number
  expandNodeStepSize: number

  nativeFileSearchEnabled: boolean

  floatingEdgeFeatureEnabled: boolean
  allowFloatingEdgeCreation: boolean
  newEdgeFromSideFloating: boolean

  flipEdgeFeatureEnabled: boolean

  betterExportFeatureEnabled: boolean

  betterReadonlyEnabled: boolean
  hideBackgroundGridWhenInReadonly: boolean
  disableNodePopup: boolean
  disableZoom: boolean
  disablePan: boolean

  readingModeFixEnabled: boolean

  autoResizeNodeFeatureEnabled: boolean
  autoResizeNodeEnabledByDefault: boolean
  autoResizeNodeMaxHeight: number
  autoResizeNodeSnapToGrid: boolean

  collapsibleGroupsFeatureEnabled: boolean
  collapsedGroupPreviewOnDrag: boolean

  focusModeFeatureEnabled: boolean

  presentationFeatureEnabled: boolean
  showSetStartNodeInPopup: boolean
  defaultSlideDimensions: [number, number]
  wrapInSlidePadding: number
  resetViewportOnPresentationEnd: boolean
  useArrowKeysToChangeSlides: boolean
  usePgUpPgDownKeysToChangeSlides: boolean
  useDirectionalSlideNavigation: boolean
  zoomToSlideWithoutPadding: boolean
  useUnclampedZoomWhilePresenting: boolean
  fullscreenPresentationEnabled: boolean
  slideTransitionAnimationDuration: number
  slideTransitionAnimationIntensity: number

  pdfAnnotationFeatureEnabled: boolean
  pdfPagesGap: number
  pdfPageSizeFactor: number
  pdfPageResolution: number

  canvasEncapsulationEnabled: boolean

  portalsFeatureEnabled: boolean

  autoFileNodeEdgesFeatureEnabled: boolean
  autoFileNodeEdgesFrontmatterKey: string

  edgeHighlightEnabled: boolean
  highlightIncomingEdges: boolean

  edgeSelectionEnabled: boolean
  selectEdgeByDirection: boolean
}

export const DEFAULT_SETTINGS_VALUES: AdvancedCanvasPluginSettingsValues = {
  nodeTypeOnDoubleClick: 'text',
  alignNewNodesToGrid: true,
  defaultTextNodeDimensions: [260, 60],
  defaultFileNodeDimensions: [400, 400],
  minNodeSize: 60,
  maxNodeWidth: -1,
  disableFontSizeRelativeToZoom: false,

  canvasMetadataCompatibilityEnabled: true,
  enableSingleNodeLinks: true,
  enableSingleNodePopupReferenceCopy: false,

  combineCustomStylesInDropdown: false,

  nodeStylingFeatureEnabled: true,
  customNodeStyleAttributes: [],
  defaultTextNodeColor: 0,
  defaultTextNodeStyleAttributes: {},
  nodeTemplates: [],

  edgesStylingFeatureEnabled: true,
  customEdgeStyleAttributes: [],
  inheritEdgeColorFromNode: false,
  defaultEdgeColor: 0,
  defaultEdgeLineDirection: 'unidirectional',
  defaultEdgeStyleAttributes: {},
  edgeStyleUpdateWhileDragging: false,
  edgeStyleSquarePathRounded: true,
  edgeStylePathfinderAllowDiagonal: false,
  edgeStylePathfinderPathRounded: true,

  variableBreakpointFeatureEnabled: false,

  zOrderingControlFeatureEnabled: false,
  zOrderingControlShowOneLayerShiftOptions: false,

  aspectRatioControlFeatureEnabled: false,

  commandsFeatureEnabled: true,
  zoomToClonedNode: true,
  cloneNodeMargin: 20,
  expandNodeStepSize: 20,

  nativeFileSearchEnabled: true,

  floatingEdgeFeatureEnabled: true,
  allowFloatingEdgeCreation: false,
  newEdgeFromSideFloating: false,

  flipEdgeFeatureEnabled: true,

  betterExportFeatureEnabled: true,

  betterReadonlyEnabled: false,
  hideBackgroundGridWhenInReadonly: true,
  disableNodePopup: false,
  disableZoom: false,
  disablePan: false,

  readingModeFixEnabled: false,

  autoResizeNodeFeatureEnabled: false,
  autoResizeNodeEnabledByDefault: false,
  autoResizeNodeMaxHeight: -1,
  autoResizeNodeSnapToGrid: true,

  collapsibleGroupsFeatureEnabled: true,
  collapsedGroupPreviewOnDrag: true,

  focusModeFeatureEnabled: false,

  presentationFeatureEnabled: true,
  showSetStartNodeInPopup: false,
  defaultSlideDimensions: [1200, 675],
  wrapInSlidePadding: 20,
  resetViewportOnPresentationEnd: true,
  useArrowKeysToChangeSlides: true,
  usePgUpPgDownKeysToChangeSlides: true,
  useDirectionalSlideNavigation: false,
  zoomToSlideWithoutPadding: true,
  useUnclampedZoomWhilePresenting: false,
  fullscreenPresentationEnabled: true,
  slideTransitionAnimationDuration: 0.5,
  slideTransitionAnimationIntensity: 1.25,

  pdfAnnotationFeatureEnabled: false,
  pdfPagesGap: 60,
  pdfPageSizeFactor: 1.5,
  pdfPageResolution: 1.5,

  canvasEncapsulationEnabled: false,

  portalsFeatureEnabled: true,

  autoFileNodeEdgesFeatureEnabled: false,
  autoFileNodeEdgesFrontmatterKey: 'canvas-edges',

  edgeHighlightEnabled: false,
  highlightIncomingEdges: false,

  edgeSelectionEnabled: false,
  selectEdgeByDirection: false,
}

export default class SettingsManager {
  private plugin: AdvancedCanvasPlugin
  private settings: AdvancedCanvasPluginSettingsValues
  private settingsTab: AdvancedCanvasPluginSettingTab

  nodeCssStylesManager: CssStylesConfigManager<StyleAttribute>
  edgeCssStylesManager: CssStylesConfigManager<StyleAttribute>

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin

    this.nodeCssStylesManager = GET_NODE_CSS_STYLES_MANAGER(plugin)
    this.edgeCssStylesManager = GET_EDGE_CSS_STYLES_MANAGER(plugin)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS_VALUES, await this.plugin.loadData())
    this.plugin.app.workspace.trigger("advanced-canvas:settings-changed")
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings)
  }

  getSetting<T extends keyof AdvancedCanvasPluginSettingsValues>(key: T): AdvancedCanvasPluginSettingsValues[T] {
    return this.settings[key]
  }

  async setSetting(data: Partial<AdvancedCanvasPluginSettingsValues>) {
    this.settings = Object.assign(this.settings, data)
    await this.saveSettings()
    this.plugin.app.workspace.trigger("advanced-canvas:settings-changed")
  }

  addSettingsTab() {
    this.settingsTab = new AdvancedCanvasPluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}

export class AdvancedCanvasPluginSettingTab extends PluginSettingTab {
  settingsManager: SettingsManager

  constructor(plugin: AdvancedCanvasPlugin, settingsManager: SettingsManager) {
    super(plugin.app, plugin)
    this.settingsManager = settingsManager
  }

  private getKeyIndexFromSettingKey(settingKey: string): { key: string, index: number | string | null } {
    const match = settingKey.match(/^(.*)\[(.+)\]$/)
    if (match) return {
      key: match[1],
      index: isNaN(Number(match[2])) ? match[2] : Number(match[2])
    }

    return { key: settingKey, index: null }
  }

  override getControlValue(settingKey: string): unknown {
    const { key, index } = this.getKeyIndexFromSettingKey(settingKey)
    const value = this.settingsManager.getSetting(key as keyof AdvancedCanvasPluginSettingsValues)

    if (typeof index === 'number' && Array.isArray(value))
      return value[index]

    if (typeof index === 'string')
      return (value as Record<string, unknown>)[index]

    return value
  }

  override async setControlValue(settingKey: string, value: unknown): Promise<void> {
    const { key, index } = this.getKeyIndexFromSettingKey(settingKey)

    if (index !== null) {
      const current = this.settingsManager.getSetting(key as keyof AdvancedCanvasPluginSettingsValues)

      if (typeof index === 'number' && Array.isArray(current)) {
        current[index] = value as typeof current[number]
        return await this.settingsManager.setSetting({ [key]: current })
      } else if (typeof index === 'string') {
        if (value === "") delete (current as Record<string, unknown>)[index]
        else (current as Record<string, unknown>)[index] = value

        return await this.settingsManager.setSetting({ [key]: current })
      }
    }

    await this.settingsManager.setSetting({ [key]: value })
  }

  private getDocumentationButton(section: string, label?: string): SettingGroupItem {
    return {
      name: label ? `Open ${label} documentation` : 'Open documentation',
      action: () => {
        const anchor = activeWindow.createEl('a')
        anchor.href = `${README_URL}#${section}`
        anchor.target = '_blank'
        anchor.click()
      }
    }
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      // Ko-fi banner
      {
        type: 'group',
        items: [
          {
            name: 'Support me on Ko-fi',
            desc: 'If you like this plugin, consider supporting its development <3',
            action: () => {
              const anchor = activeWindow.createEl('a')
              anchor.href = KOFI_PAGE_URL
              anchor.target = '_blank'
              anchor.click()
            }
          }
        ]
      },

      // General settings
      {
        name: 'Node type on double click',
        desc: 'The type of node that will be created when double clicking on the canvas.',
        control: {
          type: 'dropdown',
          key: 'nodeTypeOnDoubleClick',
          options: {
            'text': 'Text',
            'file': 'File'
          } satisfies Record<NodeTypesOnDoubleClick, string>
        }
      },
      {
        name: 'Always align new nodes to grid',
        desc: 'Aligns new nodes to the grid.',
        control: {
          type: 'toggle',
          key: 'alignNewNodesToGrid'
        }
      },
      {
        type: 'page',
        name: 'Text node dimensions',
        desc: 'The default dimensions of a text node.',
        items: [
          {
            name: 'Width',
            desc: 'The default width of a text node.',
            control: {
              type: 'number',
              key: 'defaultTextNodeDimensions[0]'
            }
          },
          {
            name: 'Height',
            desc: 'The default height of a text node.',
            control: {
              type: 'number',
              key: 'defaultTextNodeDimensions[1]'
            }
          },
        ]
      },
      {
        type: 'page',
        name: 'File node dimensions',
        desc: 'The default dimensions of a file node.',
        items: [
          {
            name: 'Width',
            desc: 'The default width of a file node.',
            control: {
              type: 'number',
              key: 'defaultFileNodeDimensions[0]'
            }
          },
          {
            name: 'Height',
            desc: 'The default height of a file node.',
            control: {
              type: 'number',
              key: 'defaultFileNodeDimensions[1]'
            }
          },
        ]
      },
      {
        type: 'page',
        name: 'Node size limits',
        desc: 'The minimum and maximum size of a node.',
        items: [
          {
            name: 'Minimum node width/height',
            desc: 'The minimum size of a node.',
            control: {
              type: 'number',
              key: 'minNodeSize'
            }
          },
          {
            name: 'Maximum node width',
            desc: 'The maximum width of a node. Set to -1 for no limit.',
            control: {
              type: 'number',
              key: 'maxNodeWidth'
            }
          },
        ]
      },
      {
        name: 'Disable font size relative to zoom',
        desc: 'The font size of group node titles and edge labels will not increase when zooming out.',
        control: {
          type: 'toggle',
          key: 'disableFontSizeRelativeToZoom'
        }
      },

      // Extended commands
      {
        type: 'group',
        heading: 'Extended commands',
        items: [
          {
            name: 'Show commands in command palette',
            desc: 'Features a bunch of commands that can be used to manipulate the canvas and its content.',
            control: {
              type: 'toggle',
              key: 'commandsFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: `Extended commands configuration`,
            visible: () => this.getControlValue('commandsFeatureEnabled') as boolean,
            items: [
              {
                name: 'Zoom to cloned node',
                desc: 'Zooms to the cloned node after creation.',
                control: {
                  type: 'toggle',
                  key: 'zoomToClonedNode'
                }
              },
              {
                name: 'Clone node margin',
                desc: 'The margin between the cloned node and the source node.',
                control: {
                  type: 'number',
                  key: 'cloneNodeMargin'
                }
              },
              {
                name: 'Expand node step size',
                desc: 'The step size for expanding the node.',
                control: {
                  type: 'number',
                  key: 'expandNodeStepSize'
                }
              },
            ]
          },
          this.getDocumentationButton('canvas-commands')
        ]
      },

      // Metadata compatibility
      {
        type: 'group',
        heading: 'Metadata compatibility',
        items: [
          {
            name: 'Enable canvas metadata compatibility',
            desc: 'Makes .canvas files compatible with the backlinks and outgoing links feature and show the connections in the graph view.',
            control: {
              type: 'toggle',
              key: 'canvasMetadataCompatibilityEnabled'
            }
          },
          {
            type: 'page',
            name: 'Canvas metadata compatibility settings',
            visible: () => this.getControlValue('canvasMetadataCompatibilityEnabled') as boolean,
            items: [
              {
                name: 'Support linking to a node using a [[wikilink]]',
                desc: 'Link and embed a node using [[canvas-file#node-id]]. (Use the "Copy wikilink to node" command to get an id.)',
                control: {
                  type: 'toggle',
                  key: 'enableSingleNodeLinks'
                }
              },
              {
                name: 'Show button to copy node [[wikilink]]',
                desc: 'Shows a button in the node popup to copy the [[wikilink]] of the node for easy reference in other notes.',
                control: {
                  type: 'toggle',
                  key: 'enableSingleNodePopupReferenceCopy'
                }
              }
            ]
          },
          this.getDocumentationButton('canvas-metadata-compatibility')
        ]
      },

      // Native-like file search
      {
        type: 'group',
        heading: 'Native-like file search',
        items: [
          {
            name: 'Enable native-like file search',
            desc: 'Quickly locate text within your canvas using the native Obsidian search interface.',
            control: {
              type: 'toggle',
              key: 'nativeFileSearchEnabled'
            }
          },
          this.getDocumentationButton('native-like-file-search')
        ]
      },

      // Auto file node edges
      {
        type: 'group',
        heading: 'Auto file node edges',
        items: [
          {
            name: 'Enable auto file node edges',
            desc: 'Automatically create edges between file nodes based on their frontmatter links.',
            control: {
              type: 'toggle',
              key: 'autoFileNodeEdgesFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Auto file node edges settings',
            visible: () => this.getControlValue('autoFileNodeEdgesFeatureEnabled') as boolean,
            items: [
              {
                name: 'Frontmatter key name',
                desc: 'The frontmatter key to fetch the outgoing edges from. (Keep the default to ensure best compatibility.)',
                control: {
                  type: 'text',
                  key: 'autoFileNodeEdgesFrontmatterKey'
                }
              }
            ]
          },
          this.getDocumentationButton('auto-file-node-edges')
        ]
      },

      // Portals
      {
        type: 'group',
        heading: 'Portals',
        items: [
          {
            name: 'Enable portals',
            desc: 'Create portals to other canvases.',
            control: {
              type: 'toggle',
              key: 'portalsFeatureEnabled'
            }
          },
          this.getDocumentationButton('portals')
        ]
      },

      // Collapsible groups
      {
        type: 'group',
        heading: 'Collapsible groups',
        items: [
          {
            name: 'Enable collapsible groups',
            desc: 'Group nodes can be collapsed and expanded to keep the canvas organized.',
            control: {
              type: 'toggle',
              key: 'collapsibleGroupsFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Collapsible groups settings',
            visible: () => this.getControlValue('collapsibleGroupsFeatureEnabled') as boolean,
            items: [
              {
                name: 'Collapsed group preview on drag',
                desc: 'Shows the border of a collapsed group while dragging a node.',
                control: {
                  type: 'toggle',
                  key: 'collapsedGroupPreviewOnDrag'
                }
              }
            ]
          },
          this.getDocumentationButton('collapsible-groups')
        ]
      },

      // Node/Edge styles
      {
        type: 'group',
        heading: 'Node/Edge styles',
        items: [
          {
            name: 'Combine new style settings in dropdown',
            desc: 'Combine all style attributes of Advanced Canvas in a single dropdown.',
            control: {
              type: 'toggle',
              key: 'combineCustomStylesInDropdown'
            }
          },
          this.getDocumentationButton('custom-styles', 'custom styles'),
          {
            name: 'Enable node styling',
            desc: 'Allows you to style nodes without limits.',
            control: {
              type: 'toggle',
              key: 'nodeStylingFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Node styles',
            desc: 'Manage custom node styles.',
            visible: () => this.getControlValue('nodeStylingFeatureEnabled') as boolean,
            items: [
              {
                name: 'Default text node color',
                desc: 'The default color of a text node. The default range is from 0 to 6, where 0 is no color. The range can be extended by using the Custom Colors feature of Advanced Canvas.',
                control: {
                  type: 'number',
                  key: 'defaultTextNodeColor'
                }
              }
            ]
          },
          {
            type: 'page',
            name: 'Default node style',
            desc: 'The default style of a node. The default style is applied to all newly created nodes.',
            items: [
              ...BUILTIN_NODE_STYLE_ATTRIBUTES, // BUILTINS
              ...this.settingsManager.nodeCssStylesManager.getStyles(), // CUSTOM CSS STYLES
              ...this.settingsManager.getSetting('customNodeStyleAttributes') // LEGACY CUSTOM STYLES
            ].map(value => ({
              name: value.label,
              control: {
                type: 'dropdown',
                key: `defaultTextNodeStyleAttributes[${value.key}]`,
                defaultValue: value.options.find(option => option.value === null)?.value ?? '',
                options: value.options.reduce((acc, option) => {
                  acc[option.value ?? ''] = option.label
                  return acc
                }, {} as Record<string, string>)
              }
            }))
          },
          this.getDocumentationButton('node-styles', 'node styling'),
          {
            name: 'Enable edges styling',
            desc: 'Allows you to style edges without limits.',
            control: {
              type: 'toggle',
              key: 'edgesStylingFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Edge styles',
            desc: 'Manage custom edge styles.',
            visible: () => this.getControlValue('edgesStylingFeatureEnabled') as boolean,
            items: [
              {
                name: 'Inherit edge color from node',
                desc: 'When creating a new edge by dragging from a node, the edge will inherit the color of the node it is dragged from.',
                control: {
                  type: 'toggle',
                  key: 'inheritEdgeColorFromNode'
                }
              },
              {
                name: 'Default edge color',
                desc: 'The default color of an edge. The default range is from 0 to 6, where 0 is no color. The range can be extended by using the Custom Colors feature of Advanced Canvas.',
                control: {
                  type: 'number',
                  key: 'defaultEdgeColor'
                }
              },
              {
                name: 'Default edge line direction',
                desc: 'The default line direction of an edge.',
                control: {
                  type: 'dropdown',
                  key: 'defaultEdgeLineDirection',
                  options: {
                    'nondirectional': 'Nondirectional',
                    'unidirectional': 'Unidirectional',
                    'bidirectional': 'Bidirectional'
                  } satisfies Record<EdgeLineDirection, string>
                }
              },
              {
                name: 'Update edge style while dragging',
                desc: 'Updates the edge style while dragging an edge. (Can be very slow)',
                control: {
                  type: 'toggle',
                  key: 'edgeStyleUpdateWhileDragging'
                }
              },
              {
                name: 'Round square path edges',
                desc: 'Rounds the corners of square path edges.',
                control: {
                  type: 'toggle',
                  key: 'edgeStyleSquarePathRounded'
                }
              },
              {
                name: 'Allow diagonal A* paths',
                desc: 'Allows diagonal paths for the A* path style.',
                control: {
                  type: 'toggle',
                  key: 'edgeStylePathfinderAllowDiagonal'
                }
              },
              {
                name: 'Round A* path edges',
                desc: 'Rounds the A* path style.',
                control: {
                  type: 'toggle',
                  key: 'edgeStylePathfinderPathRounded'
                }
              }
            ]
          },
          {
            type: 'page',
            name: 'Default edge style',
            desc: 'The default style of an edge. The default style is applied to all newly created edges.',
            items: [
              ...BUILTIN_EDGE_STYLE_ATTRIBUTES, // BUILTINS
              ...this.settingsManager.edgeCssStylesManager.getStyles(), // CUSTOM CSS STYLES
              ...this.settingsManager.getSetting('customEdgeStyleAttributes') // LEGACY CUSTOM STYLES
            ].map(value => ({
              name: value.label,
              control: {
                type: 'dropdown',
                key: `defaultEdgeStyleAttributes[${value.key}]`,
                defaultValue: value.options.find(option => option.value === null)?.value ?? '',
                options: value.options.reduce((acc, option) => {
                  acc[option.value ?? ''] = option.label
                  return acc
                }, {} as Record<string, string>)
              }
            }))
          },
          this.getDocumentationButton('edge-styles', 'edge styling')
        ]
      },

      // Floating edges
      {
        type: 'group',
        heading: 'Floating edges',
        items: [
          {
            name: 'Enable floating edges',
            desc: 'Floating edges are automatically placed on the most suitable side of the node.',
            control: {
              type: 'toggle',
              key: 'floatingEdgeFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Floating edges settings',
            visible: () => this.getControlValue('floatingEdgeFeatureEnabled') as boolean,
            items: [
              {
                name: 'Allow floating edge creation',
                desc: 'Create floating edges by dragging over the target node without placing the edge on a specific side connection point. (If disabled, floating edges can only be created and used by other Advanced Canvas features.)',
                control: {
                  type: 'toggle',
                  key: 'allowFloatingEdgeCreation'
                }
              },
              {
                name: 'New edge from side floating',
                desc: 'The "from" side of new edges will always be floating.',
                control: {
                  type: 'toggle',
                  key: 'newEdgeFromSideFloating'
                }
              }
            ]
          },
          this.getDocumentationButton('floating-edges-automatic-edge-side')
        ]
      },

      // Flip edges
      {
        type: 'group',
        heading: 'Flip edges',
        items: [
          {
            name: 'Enable flip edges',
            desc: 'Flip the direction of edges using the popup menu.',
            control: {
              type: 'toggle',
              key: 'flipEdgeFeatureEnabled'
            }
          },
          this.getDocumentationButton('flip-edge')
        ]
      },

      // Presentations
      {
        type: 'group',
        heading: 'Presentations',
        items: [
          {
            name: 'Enable presentations',
            desc: 'Create a presentation from your canvas.',
            control: {
              type: 'toggle',
              key: 'presentationFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Presentations settings',
            visible: () => this.getControlValue('presentationFeatureEnabled') as boolean,
            items: [
              {
                name: 'Show "Set Start Node" in node popup',
                desc: 'Shows the "Set Start Node" option in the node popup. If not enabled, you can still set the start node using the corresponding command.',
                control: {
                  type: 'toggle',
                  key: 'showSetStartNodeInPopup'
                }
              },
              {
                type: 'page',
                name: 'Default slide dimensions',
                desc: 'The default dimensions of a slide.',
                items: [
                  {
                    name: 'Width',
                    desc: 'The default width of a slide.',
                    control: {
                      type: 'number',
                      key: 'defaultSlideDimensions[0]'
                    }
                  },
                  {
                    name: 'Height',
                    desc: 'The default height of a slide.',
                    control: {
                      type: 'number',
                      key: 'defaultSlideDimensions[1]'
                    }
                  },
                ]
              },
              {
                name: 'Wrap in slide padding',
                desc: 'The padding of the slide when wrapping the canvas in a slide.',
                control: {
                  type: 'number',
                  key: 'wrapInSlidePadding'
                }
              },
              {
                name: 'Reset viewport on presentation end',
                desc: 'Resets the viewport to the original position after the presentation ends.',
                control: {
                  type: 'toggle',
                  key: 'resetViewportOnPresentationEnd'
                }
              },
              {
                name: 'Use arrow keys to change slides',
                desc: 'Use the arrow keys to change slides in presentation mode.',
                control: {
                  type: 'toggle',
                  key: 'useArrowKeysToChangeSlides'
                }
              },
              {
                name: 'Use PgUp/PgDown keys to change slides',
                desc: 'Use the PgUp/PgDown keys to change slides in presentation mode. (Makes the presentation mode compatible with most presentation remotes.)',
                control: {
                  type: 'toggle',
                  key: 'usePgUpPgDownKeysToChangeSlides'
                }
              },
              {
                name: 'Use directional slide navigation',
                desc: 'Navigating with the arrow keys will try to navigate along the slide\'s edge in the pressed direction instead of just navigating forward or backward in the slide order.',
                control: {
                  type: 'toggle',
                  key: 'useDirectionalSlideNavigation'
                }
              },
              {
                name: 'Zoom to slide without padding',
                desc: 'Zooms to the slide without padding.',
                control: {
                  type: 'toggle',
                  key: 'zoomToSlideWithoutPadding'
                }
              },
              {
                name: 'Use unclamped zoom while presenting',
                desc: 'The zoom will not be clamped while presenting.',
                control: {
                  type: 'toggle',
                  key: 'useUnclampedZoomWhilePresenting'
                }
              },
              {
                name: 'Enter fullscreen while presenting',
                desc: 'Presentations automatically request fullscreen. Disable to keep Obsidian windowed during presentations.',
                control: {
                  type: 'toggle',
                  key: 'fullscreenPresentationEnabled'
                }
              },
              {
                name: 'Slide transition animation duration',
                desc: 'The duration of the slide transition animation in seconds. Set to 0 to disable the animation.',
                control: {
                  type: 'number',
                  key: 'slideTransitionAnimationDuration'
                }
              },
              {
                name: 'Slide transition animation intensity',
                desc: 'The intensity of the slide transition animation. The higher the value, the more the canvas will zoom out before zooming in on the next slide.',
                control: {
                  type: 'number',
                  key: 'slideTransitionAnimationIntensity'
                }
              },
            ]
          },
          this.getDocumentationButton('presentation-mode')
        ]
      },

      // PDF annotation
      {
        type: 'group',
        heading: 'PDF annotation',
        items: [
          {
            name: 'Enable PDF annotation',
            desc: 'Annotate PDF files in the canvas.',
            control: {
              type: 'toggle',
              key: 'pdfAnnotationFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'PDF annotation settings',
            visible: () => this.getControlValue('pdfAnnotationFeatureEnabled') as boolean,
            items: [
              {
                name: 'PDF pages gap',
                desc: 'The gap between PDF pages in pixels.',
                control: {
                  type: 'number',
                  key: 'pdfPagesGap'
                }
              },
              {
                name: 'PDF page size factor',
                desc: 'The size factor of the PDF pages. The higher the value, the larger the newly created PDF pages will be.',
                control: {
                  type: 'number',
                  key: 'pdfPageSizeFactor'
                }
              },
              {
                name: 'PDF page resolution',
                desc: 'The resolution of the PDF pages. The higher the value, the sharper the pages will be (heavily affects performance).',
                control: {
                  type: 'number',
                  key: 'pdfPageResolution'
                }
              },
            ]
          },
          this.getDocumentationButton('pdf-annotation')
        ]
      },

      // Z ordering controls
      {
        type: 'group',
        heading: 'Z ordering controls',
        items: [
          {
            name: 'Enable Z ordering controls',
            desc: 'Change the persistent z-index of nodes using the context menu.',
            control: {
              type: 'toggle',
              key: 'zOrderingControlFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Z ordering controls settings',
            visible: () => this.getControlValue('zOrderingControlFeatureEnabled') as boolean,
            items: [
              {
                name: 'Show one layer shift options',
                desc: 'Move nodes one layer forward or backward.',
                control: {
                  type: 'toggle',
                  key: 'zOrderingControlShowOneLayerShiftOptions'
                }
              }
            ]
          }
        ]
      },

      // Aspect ratio control
      {
        type: 'group',
        heading: 'Aspect ratio control',
        items: [
          {
            name: 'Enable aspect ratio control',
            desc: 'Change the aspect ratio of nodes using the context menu.',
            control: {
              type: 'toggle',
              key: 'aspectRatioControlFeatureEnabled'
            }
          }
        ]
      },

      // Variable breakpoint
      {
        type: 'group',
        heading: 'Variable breakpoint',
        items: [
          {
            name: 'Enable variable breakpoint',
            desc: `Change the zoom breakpoint (the zoom level at which the nodes won't render their content anymore) on a per-node basis using the ${VARIABLE_BREAKPOINT_CSS_VAR} CSS variable.`,
            control: {
              type: 'toggle',
              key: 'variableBreakpointFeatureEnabled'
            }
          },
          this.getDocumentationButton('variable-breakpoints')
        ]
      },

      // Alternative text rendering
      {
        type: 'group',
        heading: 'Alternative text rendering',
        items: [
          {
            name: 'Enable alternative text rendering',
            desc: 'Tries to synchronize editing and reading view rendering. Caution: Causes visual inconsistencies compared to the default Obsidian reading view.',
            control: {
              type: 'toggle',
              key: 'readingModeFixEnabled'
            }
          },
          this.getDocumentationButton('alternative-text-rendering')
        ]
      },

      // Auto resize node
      {
        type: 'group',
        heading: 'Auto resize node',
        items: [
          {
            name: 'Enable auto resize node',
            desc: 'Automatically resize the height of a node to fit the content.',
            control: {
              type: 'toggle',
              key: 'autoResizeNodeFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: 'Auto resize node settings',
            visible: () => this.getControlValue('autoResizeNodeFeatureEnabled') as boolean,
            items: [
              {
                name: 'Enable auto resize by default',
                desc: 'The auto resize feature will be enabled by default for all nodes.',
                control: {
                  type: 'toggle',
                  key: 'autoResizeNodeEnabledByDefault'
                }
              },
              {
                name: 'Max height',
                desc: 'The maximum height of the node when auto resizing (-1 for unlimited).',
                control: {
                  type: 'number',
                  key: 'autoResizeNodeMaxHeight'
                }
              },
              {
                name: 'Snap to grid',
                desc: 'The height of the node will snap to the grid.',
                control: {
                  type: 'toggle',
                  key: 'autoResizeNodeSnapToGrid'
                }
              },
            ]
          },
          this.getDocumentationButton('auto-node-resizing')
        ]
      },

      // Canvas encapsulation
      {
        type: 'group',
        heading: 'Canvas encapsulation',
        items: [
          {
            name: 'Enable canvas encapsulation',
            desc: 'Encapsulate a selection of nodes and edges into a new canvas using the context menu.',
            control: {
              type: 'toggle',
              key: 'canvasEncapsulationEnabled'
            }
          },
          this.getDocumentationButton('encapsulate-selection')
        ]
      },

      // Better readonly
      {
        type: 'group',
        heading: 'Better readonly',
        items: [
          {
            name: 'Enable better readonly',
            desc: 'Improve the readonly mode.',
            control: {
              type: 'toggle',
              key: 'betterReadonlyEnabled'
            }
          },
          {
            type: 'page',
            name: 'Better readonly settings',
            visible: () => this.getControlValue('betterReadonlyEnabled') as boolean,
            items: [
              {
                name: 'Hide background grid when in readonly',
                desc: 'Hides the background grid when in readonly mode.',
                control: {
                  type: 'toggle',
                  key: 'hideBackgroundGridWhenInReadonly'
                }
              },
              {
                name: 'Disable node popup',
                desc: 'Disables the node popup in readonly mode.',
                control: {
                  type: 'toggle',
                  key: 'disableNodePopup'
                }
              },
              {
                name: 'Disable zoom',
                desc: 'Disables zooming in readonly mode.',
                control: {
                  type: 'toggle',
                  key: 'disableZoom'
                }
              },
              {
                name: 'Disable pan',
                desc: 'Disables panning in readonly mode.',
                control: {
                  type: 'toggle',
                  key: 'disablePan'
                }
              },
            ]
          },
          this.getDocumentationButton('better-readonly')
        ]
      },

      // Edge highlight
      {
        type: 'group',
        heading: 'Edge highlight',
        items: [
          {
            name: 'Enable edge highlight',
            desc: 'Highlight outgoing (and optionally incoming) edges of a selected node.',
            control: {
              type: 'toggle',
              key: 'edgeHighlightEnabled'
            }
          },
          {
            type: 'page',
            name: 'Edge highlight settings',
            visible: () => this.getControlValue('edgeHighlightEnabled') as boolean,
            items: [
              {
                name: 'Highlight incoming edges',
                desc: 'Also highlights incoming edges.',
                control: {
                  type: 'toggle',
                  key: 'highlightIncomingEdges'
                }
              }
            ]
          },
          this.getDocumentationButton('edge-highlight')
        ]
      },

      // Edge selection
      {
        type: 'group',
        heading: 'Edge selection',
        items: [
          {
            name: 'Enable edge selection',
            desc: 'Select edges connected to the selected node(s) using the popup menu.',
            control: {
              type: 'toggle',
              key: 'edgeSelectionEnabled'
            }
          },
          {
            type: 'page',
            name: 'Edge selection settings',
            visible: () => this.getControlValue('edgeSelectionEnabled') as boolean,
            items: [
              {
                name: 'Select edge by direction',
                desc: 'Select incoming or outgoing edges using separate popup menu items.',
                control: {
                  type: 'toggle',
                  key: 'selectEdgeByDirection'
                }
              }
            ]
          },
          this.getDocumentationButton('edge-selection')
        ]
      },

      // Focus Mode
      {
        type: 'group',
        heading: 'Focus Mode',
        items: [
          {
            name: 'Enable focus mode',
            desc: 'Focus on a single node and blur all other nodes.',
            control: {
              type: 'toggle',
              key: 'focusModeFeatureEnabled'
            }
          },
          this.getDocumentationButton('focus-mode')
        ]
      },

      // Better export
      {
        type: 'group',
        heading: 'Better export',
        items: [
          {
            name: 'Enable better export',
            desc: 'Export to PNG/SVG with transparency and other options.',
            control: {
              type: 'toggle',
              key: 'betterExportFeatureEnabled'
            }
          }
        ]
      },
    ]
  }
}
