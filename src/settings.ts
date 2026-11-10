import { PluginSettingTab, SettingDefinitionItem, SettingGroupItem } from "obsidian"
import { GET_EDGE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/edge-styles"
import { GET_NODE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/node-styles"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"
import { NodeTemplate } from "./canvas-extensions/node-templates-canvas-extension"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "./canvas-extensions/variable-breakpoint-canvas-extension"
import AdvancedCanvasPlugin from "./main"
import CssStylesConfigManager from "./managers/css-styles-config-manager"
import t from "./utils/i18n"

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
  edgeStyleSquarePathRoundedRadius: number
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
  edgeStyleSquarePathRoundedRadius: 5,
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
      name: label ? t({ en: `Open ${label} documentation`, zh: `查看${label}文档` }) : t({ en: 'Open documentation', zh: '打开文档' }),
      action: () => window.open(`${README_URL}#${section}`, '_blank')
    }
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      // Ko-fi banner
      {
        type: 'group',
        items: [
          {
            name: t({ en: 'Support me on Ko-fi', zh: '在 Ko-fi 上支持我' }),
            desc: t({ en: 'If you like this plugin, consider supporting its development <3', zh: '如果你喜欢这个插件，欢迎支持它的开发 <3' }),
            action: () => window.open(KOFI_PAGE_URL, '_blank')
          }
        ]
      },

      // General settings
      {
        name: t({ en: 'Node type on double click', zh: '双击创建的节点类型' }),
        desc: t({ en: 'The type of node that will be created when double clicking on the canvas.', zh: '在白板上双击时创建的节点类型。' }),
        control: {
          type: 'dropdown',
          key: 'nodeTypeOnDoubleClick',
          options: {
            'text': t({ en: 'Text', zh: '文本' }),
            'file': t({ en: 'File', zh: '文件' }),
          } satisfies Record<NodeTypesOnDoubleClick, string>
        }
      },
      {
        name: t({ en: 'Always align new nodes to grid', zh: '新建节点始终对齐网格' }),
        desc: t({ en: 'Aligns new nodes to the grid.', zh: '将新建节点对齐到网格。' }),
        control: {
          type: 'toggle',
          key: 'alignNewNodesToGrid'
        }
      },
      {
        type: 'page',
        name: t({ en: 'Text node dimensions', zh: '文本节点尺寸' }),
        desc: t({ en: 'The default dimensions of a text node.', zh: '文本节点的默认尺寸。' }),
        items: [
          {
            name: t({ en: 'Width', zh: '宽度' }),
            desc: t({ en: 'The default width of a text node.', zh: '文本节点的默认宽度。' }),
            control: {
              type: 'number',
              key: 'defaultTextNodeDimensions[0]'
            }
          },
          {
            name: t({ en: 'Height', zh: '高度' }),
            desc: t({ en: 'The default height of a text node.', zh: '文本节点的默认高度。' }),
            control: {
              type: 'number',
              key: 'defaultTextNodeDimensions[1]'
            }
          },
        ]
      },
      {
        type: 'page',
        name: t({ en: 'File node dimensions', zh: '文件节点尺寸' }),
        desc: t({ en: 'The default dimensions of a file node.', zh: '文件节点的默认尺寸。' }),
        items: [
          {
            name: t({ en: 'Width', zh: '宽度' }),
            desc: t({ en: 'The default width of a file node.', zh: '文件节点的默认宽度。' }),
            control: {
              type: 'number',
              key: 'defaultFileNodeDimensions[0]'
            }
          },
          {
            name: t({ en: 'Height', zh: '高度' }),
            desc: t({ en: 'The default height of a file node.', zh: '文件节点的默认高度。' }),
            control: {
              type: 'number',
              key: 'defaultFileNodeDimensions[1]'
            }
          },
        ]
      },
      {
        type: 'page',
        name: t({ en: 'Node size limits', zh: '节点尺寸限制' }),
        desc: t({ en: 'The minimum and maximum size of a node.', zh: '节点的最小与最大尺寸。' }),
        items: [
          {
            name: t({ en: 'Minimum node width/height', zh: '节点最小宽度/高度' }),
            desc: t({ en: 'The minimum size of a node.', zh: '节点的最小尺寸。' }),
            control: {
              type: 'number',
              key: 'minNodeSize'
            }
          },
          {
            name: t({ en: 'Maximum node width', zh: '节点最大宽度' }),
            desc: t({ en: 'The maximum width of a node. Set to -1 for no limit.', zh: '节点的最大宽度。设为 -1 表示不限制。' }),
            control: {
              type: 'number',
              key: 'maxNodeWidth'
            }
          },
        ]
      },
      {
        name: t({ en: 'Disable font size relative to zoom', zh: '字号不随缩放变化' }),
        desc: t({ en: 'The font size of group node titles and edge labels will not increase when zooming out.', zh: '缩小时，分组标题与连线标签的字号不会变大。' }),
        control: {
          type: 'toggle',
          key: 'disableFontSizeRelativeToZoom'
        }
      },

      // Extended commands
      {
        type: 'group',
        heading: t({ en: 'Extended commands', zh: '扩展命令' }),
        items: [
          {
            name: t({ en: 'Show commands in command palette', zh: '在命令面板中显示命令' }),
            desc: t({ en: 'Features a bunch of commands that can be used to manipulate the canvas and its content.', zh: '提供一组用于操作白板及其内容的命令。' }),
            control: {
              type: 'toggle',
              key: 'commandsFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: `Extended commands configuration`, zh: `扩展命令配置` }),
            visible: () => this.getControlValue('commandsFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Zoom to cloned node', zh: '缩放到克隆节点' }),
                desc: t({ en: 'Zooms to the cloned node after creation.', zh: '创建后缩放到克隆节点。' }),
                control: {
                  type: 'toggle',
                  key: 'zoomToClonedNode'
                }
              },
              {
                name: t({ en: 'Clone node margin', zh: '克隆节点间距' }),
                desc: t({ en: 'The margin between the cloned node and the source node.', zh: '克隆节点与源节点之间的间距。' }),
                control: {
                  type: 'number',
                  key: 'cloneNodeMargin'
                }
              },
              {
                name: t({ en: 'Expand node step size', zh: '节点展开步长' }),
                desc: t({ en: 'The step size for expanding the node.', zh: '节点展开的步长。' }),
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
        heading: t({ en: 'Metadata compatibility', zh: '元数据兼容' }),
        items: [
          {
            name: t({ en: 'Enable canvas metadata compatibility', zh: '启用白板元数据兼容' }),
            desc: t({ en: 'Makes .canvas files compatible with the backlinks and outgoing links feature and show the connections in the graph view.', zh: '让 .canvas 文件支持反向链接与出链功能，并在关系图谱中显示连接关系。' }),
            control: {
              type: 'toggle',
              key: 'canvasMetadataCompatibilityEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Canvas metadata compatibility settings', zh: '白板元数据兼容设置' }),
            visible: () => this.getControlValue('canvasMetadataCompatibilityEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Support linking to a node using a [[wikilink]]', zh: '支持使用 [[wikilink]] 链接到节点' }),
                desc: t({ en: 'Link and embed a node using [[canvas-file#node-id]]. (Use the "Copy wikilink to node" command to get an id.)', zh: '使用 [[白板文件#节点id]] 链接并嵌入节点。（可用「复制节点 wikilink」命令获取 id。）' }),
                control: {
                  type: 'toggle',
                  key: 'enableSingleNodeLinks'
                }
              },
              {
                name: t({ en: 'Show button to copy node [[wikilink]]', zh: '显示复制节点 [[wikilink]] 的按钮' }),
                desc: t({ en: 'Shows a button in the node popup to copy the [[wikilink]] of the node for easy reference in other notes.', zh: '在节点弹出菜单中显示复制该节点 [[wikilink]] 的按钮，便于在其他笔记中引用。' }),
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
        heading: t({ en: 'Native-like file search', zh: '类原生文件搜索' }),
        items: [
          {
            name: t({ en: 'Enable native-like file search', zh: '启用类原生文件搜索' }),
            desc: t({ en: 'Quickly locate text within your canvas using the native Obsidian search interface.', zh: '使用 Obsidian 原生搜索界面快速定位白板中的文本。' }),
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
        heading: t({ en: 'Auto file node edges', zh: '文件节点自动连线' }),
        items: [
          {
            name: t({ en: 'Enable auto file node edges', zh: '启用文件节点自动连线' }),
            desc: t({ en: 'Automatically create edges between file nodes based on their frontmatter links.', zh: '根据文件节点的属性链接自动创建连线。' }),
            control: {
              type: 'toggle',
              key: 'autoFileNodeEdgesFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Auto file node edges settings', zh: '文件节点自动连线设置' }),
            visible: () => this.getControlValue('autoFileNodeEdgesFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Frontmatter key name', zh: '属性键名' }),
                desc: t({ en: 'The frontmatter key to fetch the outgoing edges from. (Keep the default to ensure best compatibility.)', zh: '用于获取出链的属性键名。（保持默认值可获得最佳兼容性。）' }),
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
        heading: t({ en: 'Portals', zh: '传送门' }),
        items: [
          {
            name: t({ en: 'Enable portals', zh: '启用传送门' }),
            desc: t({ en: 'Create portals to other canvases.', zh: '创建通往其他白板的传送门。' }),
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
        heading: t({ en: 'Collapsible groups', zh: '可折叠分组' }),
        items: [
          {
            name: t({ en: 'Enable collapsible groups', zh: '启用可折叠分组' }),
            desc: t({ en: 'Group nodes can be collapsed and expanded to keep the canvas organized.', zh: '分组节点可以折叠与展开，让白板保持有序。' }),
            control: {
              type: 'toggle',
              key: 'collapsibleGroupsFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Collapsible groups settings', zh: '可折叠分组设置' }),
            visible: () => this.getControlValue('collapsibleGroupsFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Collapsed group preview on drag', zh: '拖动时预览折叠分组' }),
                desc: t({ en: 'Shows the border of a collapsed group while dragging a node.', zh: '拖动节点时显示折叠分组的边框。' }),
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
        heading: t({ en: 'Node/Edge styles', zh: '节点/连线样式' }),
        items: [
          {
            name: t({ en: 'Combine new style settings in dropdown', zh: '新样式设置合并为下拉菜单' }),
            desc: t({ en: 'Combine all style attributes of Advanced Canvas in a single dropdown.', zh: '将所有 Advanced Canvas 样式属性合并到同一个下拉菜单中。' }),
            control: {
              type: 'toggle',
              key: 'combineCustomStylesInDropdown'
            }
          },
          this.getDocumentationButton('custom-styles', 'custom styles'),
          {
            name: t({ en: 'Enable node styling', zh: '启用节点样式' }),
            desc: t({ en: 'Allows you to style nodes without limits.', zh: '允许不受限制地设置节点样式。' }),
            control: {
              type: 'toggle',
              key: 'nodeStylingFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Node styles', zh: '节点样式' }),
            desc: t({ en: 'Manage custom node styles.', zh: '管理自定义节点样式。' }),
            visible: () => this.getControlValue('nodeStylingFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Default text node color', zh: '默认文本节点颜色' }),
                desc: t({ en: 'The default color of a text node. The default range is from 0 to 6, where 0 is no color. The range can be extended by using the Custom Colors feature of Advanced Canvas.', zh: '文本节点的默认颜色。默认范围为 0 到 6，0 表示无颜色。可通过 Advanced Canvas 的自定义颜色功能扩展范围。' }),
                control: {
                  type: 'number',
                  key: 'defaultTextNodeColor'
                }
              }
            ]
          },
          {
            type: 'page',
            name: t({ en: 'Default node style', zh: '默认节点样式' }),
            desc: t({ en: 'The default style of a node. The default style is applied to all newly created nodes.', zh: '节点的默认样式，应用于所有新建节点。' }),
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
            name: t({ en: 'Enable edges styling', zh: '启用连线样式' }),
            desc: t({ en: 'Allows you to style edges without limits.', zh: '允许不受限制地设置连线样式。' }),
            control: {
              type: 'toggle',
              key: 'edgesStylingFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Edge styles', zh: '连线样式' }),
            desc: t({ en: 'Manage custom edge styles.', zh: '管理自定义连线样式。' }),
            visible: () => this.getControlValue('edgesStylingFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Inherit edge color from node', zh: '连线继承节点颜色' }),
                desc: t({ en: 'When creating a new edge by dragging from a node, the edge will inherit the color of the node it is dragged from.', zh: '从节点拖出新连线时，连线将继承起始节点的颜色。' }),
                control: {
                  type: 'toggle',
                  key: 'inheritEdgeColorFromNode'
                }
              },
              {
                name: t({ en: 'Default edge color', zh: '默认连线颜色' }),
                desc: t({ en: 'The default color of an edge. The default range is from 0 to 6, where 0 is no color. The range can be extended by using the Custom Colors feature of Advanced Canvas.', zh: '连线的默认颜色。默认范围为 0 到 6，0 表示无颜色。可通过 Advanced Canvas 的自定义颜色功能扩展范围。' }),
                control: {
                  type: 'number',
                  key: 'defaultEdgeColor'
                }
              },
              {
                name: t({ en: 'Default edge line direction', zh: '默认连线方向' }),
                desc: t({ en: 'The default line direction of an edge.', zh: '连线的默认方向。' }),
                control: {
                  type: 'dropdown',
                  key: 'defaultEdgeLineDirection',
                  options: {
                    'nondirectional': t({ en: 'Nondirectional', zh: '无方向' }),
                    'unidirectional': t({ en: 'Unidirectional', zh: '单向' }),
                    'bidirectional': t({ en: 'Bidirectional', zh: '双向' }),
                  } satisfies Record<EdgeLineDirection, string>
                }
              },
              {
                name: t({ en: 'Update edge style while dragging', zh: '拖动时更新连线样式' }),
                desc: t({ en: 'Updates the edge style while dragging an edge. (Can be very slow)', zh: '拖动连线时实时更新其样式。（可能非常慢）' }),
                control: {
                  type: 'toggle',
                  key: 'edgeStyleUpdateWhileDragging'
                }
              },
              {
                name: t({ en: 'Square path edges corner radius', zh: '直角路径连线圆角半径' }),
                desc: t({ en: 'Rounds the corners of square path edges by the specified radius.', zh: '按指定半径将直角路径连线的拐角设为圆角。' }),
                control: {
                  type: 'number',
                  key: 'edgeStyleSquarePathRoundedRadius'
                }
              },
              {
                name: t({ en: 'Allow diagonal A* paths', zh: '允许 A* 斜线路径' }),
                desc: t({ en: 'Allows diagonal paths for the A* path style.', zh: '允许 A* 路径样式使用斜线。' }),
                control: {
                  type: 'toggle',
                  key: 'edgeStylePathfinderAllowDiagonal'
                }
              },
              {
                name: t({ en: 'Round A* path edges', zh: '圆角 A* 路径连线' }),
                desc: t({ en: 'Rounds the A* path style.', zh: '将 A* 路径样式设为圆角。' }),
                control: {
                  type: 'toggle',
                  key: 'edgeStylePathfinderPathRounded'
                }
              }
            ]
          },
          {
            type: 'page',
            name: t({ en: 'Default edge style', zh: '默认连线样式' }),
            desc: t({ en: 'The default style of an edge. The default style is applied to all newly created edges.', zh: '连线的默认样式，应用于所有新建连线。' }),
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
        heading: t({ en: 'Floating edges', zh: '浮动连线' }),
        items: [
          {
            name: t({ en: 'Enable floating edges', zh: '启用浮动连线' }),
            desc: t({ en: 'Floating edges are automatically placed on the most suitable side of the node.', zh: '浮动连线会自动放置在节点最合适的一侧。' }),
            control: {
              type: 'toggle',
              key: 'floatingEdgeFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Floating edges settings', zh: '浮动连线设置' }),
            visible: () => this.getControlValue('floatingEdgeFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Allow floating edge creation', zh: '允许创建浮动连线' }),
                desc: t({ en: 'Create floating edges by dragging over the target node without placing the edge on a specific side connection point. (If disabled, floating edges can only be created and used by other Advanced Canvas features.)', zh: '拖动到目标节点上即可创建浮动连线，无需落在指定的边缘连接点。（关闭后，仅 Advanced Canvas 的其他功能可创建和使用浮动连线。）' }),
                control: {
                  type: 'toggle',
                  key: 'allowFloatingEdgeCreation'
                }
              },
              {
                name: t({ en: 'New edge from side floating', zh: '新连线的起点为浮动' }),
                desc: t({ en: 'The "from" side of new edges will always be floating.', zh: '新连线的起点将始终为浮动端。' }),
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
        heading: t({ en: 'Flip edges', zh: '翻转连线' }),
        items: [
          {
            name: t({ en: 'Enable flip edges', zh: '启用翻转连线' }),
            desc: t({ en: 'Flip the direction of edges using the popup menu.', zh: '使用弹出菜单翻转连线方向。' }),
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
        heading: t({ en: 'Presentations', zh: '演示' }),
        items: [
          {
            name: t({ en: 'Enable presentations', zh: '启用演示' }),
            desc: t({ en: 'Create a presentation from your canvas.', zh: '从白板创建演示。' }),
            control: {
              type: 'toggle',
              key: 'presentationFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Presentations settings', zh: '演示设置' }),
            visible: () => this.getControlValue('presentationFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Show "Set Start Node" in node popup', zh: '在节点弹出菜单中显示「设置起始节点」' }),
                desc: t({ en: 'Shows the "Set Start Node" option in the node popup. If not enabled, you can still set the start node using the corresponding command.', zh: '在节点弹出菜单中显示「设置起始节点」选项。关闭后，仍可通过对应命令设置起始节点。' }),
                control: {
                  type: 'toggle',
                  key: 'showSetStartNodeInPopup'
                }
              },
              {
                type: 'page',
                name: t({ en: 'Default slide dimensions', zh: '默认幻灯片尺寸' }),
                desc: t({ en: 'The default dimensions of a slide.', zh: '幻灯片的默认尺寸。' }),
                items: [
                  {
                    name: t({ en: 'Width', zh: '宽度' }),
                    desc: t({ en: 'The default width of a slide.', zh: '幻灯片的默认宽度。' }),
                    control: {
                      type: 'number',
                      key: 'defaultSlideDimensions[0]'
                    }
                  },
                  {
                    name: t({ en: 'Height', zh: '高度' }),
                    desc: t({ en: 'The default height of a slide.', zh: '幻灯片的默认高度。' }),
                    control: {
                      type: 'number',
                      key: 'defaultSlideDimensions[1]'
                    }
                  },
                ]
              },
              {
                name: t({ en: 'Wrap in slide padding', zh: '幻灯片包装内边距' }),
                desc: t({ en: 'The padding of the slide when wrapping the canvas in a slide.', zh: '将白板包装为幻灯片时的内边距。' }),
                control: {
                  type: 'number',
                  key: 'wrapInSlidePadding'
                }
              },
              {
                name: t({ en: 'Reset viewport on presentation end', zh: '演示结束后重置视口' }),
                desc: t({ en: 'Resets the viewport to the original position after the presentation ends.', zh: '演示结束后将视口恢复至初始位置。' }),
                control: {
                  type: 'toggle',
                  key: 'resetViewportOnPresentationEnd'
                }
              },
              {
                name: t({ en: 'Use arrow keys to change slides', zh: '使用方向键切换幻灯片' }),
                desc: t({ en: 'Use the arrow keys to change slides in presentation mode.', zh: '演示模式下使用方向键切换幻灯片。' }),
                control: {
                  type: 'toggle',
                  key: 'useArrowKeysToChangeSlides'
                }
              },
              {
                name: t({ en: 'Use PgUp/PgDown keys to change slides', zh: '使用 PgUp/PgDown 切换幻灯片' }),
                desc: t({ en: 'Use the PgUp/PgDown keys to change slides in presentation mode. (Makes the presentation mode compatible with most presentation remotes.)', zh: '演示模式下使用 PgUp/PgDown 切换幻灯片。（可使演示模式兼容大多数演示遥控器。）' }),
                control: {
                  type: 'toggle',
                  key: 'usePgUpPgDownKeysToChangeSlides'
                }
              },
              {
                name: t({ en: 'Use directional slide navigation', zh: '使用方向键导航幻灯片' }),
                desc: t({ en: 'Navigating with the arrow keys will try to navigate along the slide\'s edge in the pressed direction instead of just navigating forward or backward in the slide order.', zh: '使用方向键时，将沿幻灯片边缘按所按方向导航，而不只是按幻灯片顺序前进或后退。' }),
                control: {
                  type: 'toggle',
                  key: 'useDirectionalSlideNavigation'
                }
              },
              {
                name: t({ en: 'Zoom to slide without padding', zh: '缩放到幻灯片（无内边距）' }),
                desc: t({ en: 'Zooms to the slide without padding.', zh: '缩放到幻灯片且不含内边距。' }),
                control: {
                  type: 'toggle',
                  key: 'zoomToSlideWithoutPadding'
                }
              },
              {
                name: t({ en: 'Use unclamped zoom while presenting', zh: '演示时使用无限制缩放' }),
                desc: t({ en: 'The zoom will not be clamped while presenting.', zh: '演示时缩放不受限制。' }),
                control: {
                  type: 'toggle',
                  key: 'useUnclampedZoomWhilePresenting'
                }
              },
              {
                name: t({ en: 'Enter fullscreen while presenting', zh: '演示时进入全屏' }),
                desc: t({ en: 'Presentations automatically request fullscreen. Disable to keep Obsidian windowed during presentations.', zh: '演示会自动请求全屏。关闭后，演示期间 Obsidian 保持窗口模式。' }),
                control: {
                  type: 'toggle',
                  key: 'fullscreenPresentationEnabled'
                }
              },
              {
                name: t({ en: 'Slide transition animation duration', zh: '幻灯片切换动画时长' }),
                desc: t({ en: 'The duration of the slide transition animation in seconds. Set to 0 to disable the animation.', zh: '幻灯片切换动画时长（秒）。设为 0 可关闭动画。' }),
                control: {
                  type: 'number',
                  key: 'slideTransitionAnimationDuration'
                }
              },
              {
                name: t({ en: 'Slide transition animation intensity', zh: '幻灯片切换动画强度' }),
                desc: t({ en: 'The intensity of the slide transition animation. The higher the value, the more the canvas will zoom out before zooming in on the next slide.', zh: '幻灯片切换动画强度。值越大，切换到下一张前白板缩小的幅度越大。' }),
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
        heading: t({ en: 'PDF annotation', zh: 'PDF 批注' }),
        items: [
          {
            name: t({ en: 'Enable PDF annotation', zh: '启用 PDF 批注' }),
            desc: t({ en: 'Annotate PDF files in the canvas.', zh: '在白板中批注 PDF 文件。' }),
            control: {
              type: 'toggle',
              key: 'pdfAnnotationFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'PDF annotation settings', zh: 'PDF 批注设置' }),
            visible: () => this.getControlValue('pdfAnnotationFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'PDF pages gap', zh: 'PDF 页面间距' }),
                desc: t({ en: 'The gap between PDF pages in pixels.', zh: 'PDF 页面之间的间距（像素）。' }),
                control: {
                  type: 'number',
                  key: 'pdfPagesGap'
                }
              },
              {
                name: t({ en: 'PDF page size factor', zh: 'PDF 页面缩放系数' }),
                desc: t({ en: 'The size factor of the PDF pages. The higher the value, the larger the newly created PDF pages will be.', zh: 'PDF 页面的缩放系数。值越大，新建的 PDF 页面越大。' }),
                control: {
                  type: 'number',
                  key: 'pdfPageSizeFactor'
                }
              },
              {
                name: t({ en: 'PDF page resolution', zh: 'PDF 页面分辨率' }),
                desc: t({ en: 'The resolution of the PDF pages. The higher the value, the sharper the pages will be (heavily affects performance).', zh: 'PDF 页面的分辨率。值越高页面越清晰（对性能影响较大）。' }),
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

      // Z-Ordering controls
      {
        type: 'group',
        heading: t({ en: 'Z-Ordering controls', zh: '层级控制' }),
        items: [
          {
            name: t({ en: 'Enable Z-Ordering controls', zh: '启用层级控制' }),
            desc: t({ en: 'Change the persistent z-index of nodes using the context menu.', zh: '使用右键菜单更改节点的持久层级。' }),
            control: {
              type: 'toggle',
              key: 'zOrderingControlFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Z-Ordering controls settings', zh: '层级控制设置' }),
            visible: () => this.getControlValue('zOrderingControlFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Show one layer shift options', zh: '显示单层移动选项' }),
                desc: t({ en: 'Move nodes one layer forward or backward.', zh: '将节点上移或下移一层。' }),
                control: {
                  type: 'toggle',
                  key: 'zOrderingControlShowOneLayerShiftOptions'
                }
              }
            ]
          },
          this.getDocumentationButton('z-ordering-control')
        ]
      },

      // Aspect ratio control
      {
        type: 'group',
        heading: t({ en: 'Aspect ratio control', zh: '宽高比控制' }),
        items: [
          {
            name: t({ en: 'Enable aspect ratio control', zh: '启用宽高比控制' }),
            desc: t({ en: 'Change the aspect ratio of nodes using the context menu.', zh: '使用右键菜单更改节点的宽高比。' }),
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
        heading: t({ en: 'Variable breakpoint', zh: '可变断点' }),
        items: [
          {
            name: t({ en: 'Enable variable breakpoint', zh: '启用可变断点' }),
            desc: t({ en: `Change the zoom breakpoint (the zoom level at which the nodes won't render their content anymore) on a per-node basis using the ${VARIABLE_BREAKPOINT_CSS_VAR} CSS variable.`, zh: `可为单个节点设置缩放断点（低于该缩放级别时节点不再渲染内容），使用 ${VARIABLE_BREAKPOINT_CSS_VAR} CSS 变量。` }),
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
        heading: t({ en: 'Alternative text rendering', zh: '替代文本渲染' }),
        items: [
          {
            name: t({ en: 'Enable alternative text rendering', zh: '启用替代文本渲染' }),
            desc: t({ en: 'Tries to synchronize editing and reading view rendering. Caution: Causes visual inconsistencies compared to the default Obsidian reading view.', zh: '尝试统一编辑视图与阅读视图的渲染。注意：与 Obsidian 默认阅读视图相比会出现视觉差异。' }),
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
        heading: t({ en: 'Auto resize node', zh: '节点自动调整高度' }),
        items: [
          {
            name: t({ en: 'Enable auto resize node', zh: '启用节点自动调整高度' }),
            desc: t({ en: 'Automatically resize the height of a node to fit the content.', zh: '自动调整节点高度以适配内容。' }),
            control: {
              type: 'toggle',
              key: 'autoResizeNodeFeatureEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Auto resize node settings', zh: '节点自动调整高度设置' }),
            visible: () => this.getControlValue('autoResizeNodeFeatureEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Enable auto resize by default', zh: '默认启用自动调整高度' }),
                desc: t({ en: 'The auto resize feature will be enabled by default for all nodes.', zh: '所有节点默认启用自动调整高度。' }),
                control: {
                  type: 'toggle',
                  key: 'autoResizeNodeEnabledByDefault'
                }
              },
              {
                name: t({ en: 'Max height', zh: '最大高度' }),
                desc: t({ en: 'The maximum height of the node when auto resizing (-1 for unlimited).', zh: '自动调整高度时节点的最大高度（-1 表示不限制）。' }),
                control: {
                  type: 'number',
                  key: 'autoResizeNodeMaxHeight'
                }
              },
              {
                name: t({ en: 'Snap to grid', zh: '对齐网格' }),
                desc: t({ en: 'The height of the node will snap to the grid.', zh: '节点高度将对齐到网格。' }),
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
        heading: t({ en: 'Canvas encapsulation', zh: '白板封装' }),
        items: [
          {
            name: t({ en: 'Enable canvas encapsulation', zh: '启用白板封装' }),
            desc: t({ en: 'Encapsulate a selection of nodes and edges into a new canvas using the context menu.', zh: '使用右键菜单将选中的节点与连线封装为新的白板。' }),
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
        heading: t({ en: 'Better readonly', zh: '增强只读' }),
        items: [
          {
            name: t({ en: 'Enable better readonly', zh: '启用增强只读' }),
            desc: t({ en: 'Improve the readonly mode.', zh: '改进只读模式。' }),
            control: {
              type: 'toggle',
              key: 'betterReadonlyEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Better readonly settings', zh: '增强只读设置' }),
            visible: () => this.getControlValue('betterReadonlyEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Hide background grid when in readonly', zh: '只读时隐藏背景网格' }),
                desc: t({ en: 'Hides the background grid when in readonly mode.', zh: '只读模式下隐藏背景网格。' }),
                control: {
                  type: 'toggle',
                  key: 'hideBackgroundGridWhenInReadonly'
                }
              },
              {
                name: t({ en: 'Disable node popup', zh: '禁用节点弹出菜单' }),
                desc: t({ en: 'Disables the node popup in readonly mode.', zh: '只读模式下禁用节点弹出菜单。' }),
                control: {
                  type: 'toggle',
                  key: 'disableNodePopup'
                }
              },
              {
                name: t({ en: 'Disable zoom', zh: '禁用缩放' }),
                desc: t({ en: 'Disables zooming in readonly mode.', zh: '只读模式下禁用缩放。' }),
                control: {
                  type: 'toggle',
                  key: 'disableZoom'
                }
              },
              {
                name: t({ en: 'Disable pan', zh: '禁用平移' }),
                desc: t({ en: 'Disables panning in readonly mode.', zh: '只读模式下禁用平移。' }),
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
        heading: t({ en: 'Edge highlight', zh: '连线高亮' }),
        items: [
          {
            name: t({ en: 'Enable edge highlight', zh: '启用连线高亮' }),
            desc: t({ en: 'Highlight outgoing (and optionally incoming) edges of a selected node.', zh: '高亮所选节点的出边（可选同时高亮入边）。' }),
            control: {
              type: 'toggle',
              key: 'edgeHighlightEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Edge highlight settings', zh: '连线高亮设置' }),
            visible: () => this.getControlValue('edgeHighlightEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Highlight incoming edges', zh: '高亮入边' }),
                desc: t({ en: 'Also highlights incoming edges.', zh: '同时高亮入边。' }),
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
        heading: t({ en: 'Edge selection', zh: '连线选择' }),
        items: [
          {
            name: t({ en: 'Enable edge selection', zh: '启用连线选择' }),
            desc: t({ en: 'Select edges connected to the selected node(s) using the popup menu.', zh: '使用弹出菜单选择与所选节点相连的连线。' }),
            control: {
              type: 'toggle',
              key: 'edgeSelectionEnabled'
            }
          },
          {
            type: 'page',
            name: t({ en: 'Edge selection settings', zh: '连线选择设置' }),
            visible: () => this.getControlValue('edgeSelectionEnabled') as boolean,
            items: [
              {
                name: t({ en: 'Select edge by direction', zh: '按方向选择连线' }),
                desc: t({ en: 'Select incoming or outgoing edges using separate popup menu items.', zh: '通过独立的弹出菜单项选择入边或出边。' }),
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
        heading: t({ en: 'Focus Mode', zh: '专注模式' }),
        items: [
          {
            name: t({ en: 'Enable focus mode', zh: '启用专注模式' }),
            desc: t({ en: 'Focus on a single node and blur all other nodes.', zh: '聚焦单个节点，弱化其他所有节点。' }),
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
        heading: t({ en: 'Better export', zh: '增强导出' }),
        items: [
          {
            name: t({ en: 'Enable better export', zh: '启用增强导出' }),
            desc: t({ en: 'Export to PNG/SVG with transparency and other options.', zh: '导出为 PNG/SVG，支持透明背景等选项。' }),
            control: {
              type: 'toggle',
              key: 'betterExportFeatureEnabled'
            }
          },
          this.getDocumentationButton('image-export')
        ]
      },
    ]
  }
}
