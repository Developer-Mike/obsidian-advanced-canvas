import { Notice, PluginSettingTab, Setting as SettingEl } from "obsidian"
import AdvancedCanvasPlugin from "./main"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"
import { ButtonSetting, DropdownSetting, StyleAttributesSetting, SettingsHeading, Setting, TextSetting, BooleanSetting, NumberSetting } from "./@types/Settings"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "./canvas-extensions/variable-breakpoint-canvas-extension"

const ASK_FOR_DONATION_DELAY = 1000 * 60 * 60 * 24 * 7 // 1 week
const SPENT_HOURS = 140
const RECEIVED_DONATIONS = 209
const HOURLY_RATE_GOAL = 20
const KOFI_PAGE_URL = 'https://ko-fi.com/X8X27IA08'
const KOFI_BADGE_URI = 'data:image/webp;base64,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'

export interface AdvancedCanvasPluginSettingsValues {
  downloadTimestamp: number
  askedForDonation: boolean

  nodeTypeOnDoubleClick: keyof typeof SETTINGS.general.children.nodeTypeOnDoubleClick.options
  alignNewNodesToGrid: boolean
  defaultTextNodeWidth: number
  defaultTextNodeHeight: number
  defaultFileNodeWidth: number
  defaultFileNodeHeight: number
  minNodeSize: number
  disableFontSizeRelativeToZoom: boolean

  combineCustomStylesInDropdown: boolean

  nodeStylingFeatureEnabled: boolean
  customNodeStyleAttributes: StyleAttribute[]
  defaultTextNodeStyleAttributes: { [key: string]: string }

  edgesStylingFeatureEnabled: boolean
  customEdgeStyleAttributes: StyleAttribute[]
  defaultEdgeLineDirection: keyof typeof SETTINGS.edgesStylingFeatureEnabled.children.defaultEdgeLineDirection.options
  defaultEdgeStyleAttributes: { [key: string]: string }
  edgeStyleUpdateWhileDragging: boolean
  edgeStyleDirectRotateArrow: boolean
  edgeStylePathfinderGridResolution: number
  edgeStylePathfinderPathRounded: boolean

  variableBreakpointFeatureEnabled: boolean

  commandsFeatureEnabled: boolean
  zoomToClonedNode: boolean
  cloneNodeMargin: number
  expandNodeStepSize: number

  flipEdgeFeatureEnabled: boolean

  betterReadonlyEnabled: boolean
  disableNodePopup: boolean
  disableZoom: boolean
  disablePan: boolean

  autoResizeNodeFeatureEnabled: boolean
  autoResizeNodeEnabledByDefault: boolean
  autoResizeNodeMaxHeight: number
  autoResizeNodeSnapToGrid: boolean

  collapsibleGroupsFeatureEnabled: boolean
  collapsedGroupPreviewOnDrag: boolean

  focusModeFeatureEnabled: boolean

  presentationFeatureEnabled: boolean
  showSetStartNodeInPopup: boolean
  defaultSlideSize: string
  wrapInSlidePadding: number
  resetViewportOnPresentationEnd: boolean
  useArrowKeysToChangeSlides: boolean
  usePgUpPgDownKeysToChangeSlides: boolean
  zoomToSlideWithoutPadding: boolean
  slideTransitionAnimationDuration: number
  slideTransitionAnimationIntensity: number

  canvasEncapsulationEnabled: boolean

  portalsFeatureEnabled: boolean
  maintainClosedPortalSize: boolean
  showEdgesIntoDisabledPortals: boolean
}

// Extend the SettingsHeading type to include the children property with the correct types
type ValidSettingsHeading = SettingsHeading & { 
  children: { 
    [key in keyof AdvancedCanvasPluginSettingsValues]?: Setting 
  } 
}

export const SETTINGS = {
  // @ts-ignore
  general: {
    label: 'General',
    description: 'General settings of the Advanced Canvas plugin.',
    disableToggle: true,
    children: {
      nodeTypeOnDoubleClick: {
        label: 'Node type on double click',
        description: 'The type of node that will be created when double clicking on the canvas.',
        type: 'dropdown',
        options: {
          'text': 'Text',
          'file': 'File'
        }
      } as DropdownSetting,
      alignNewNodesToGrid: {
        label: 'Always align new nodes to grid',
        description: 'When enabled, new nodes will be aligned to the grid.',
        type: 'boolean'
      },
      defaultTextNodeWidth: {
        label: 'Default text node width',
        description: 'The default width of a text node.',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      defaultTextNodeHeight: {
        label: 'Default text node height',
        description: 'The default height of a text node.',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      defaultFileNodeWidth: {
        label: 'Default file node width',
        description: 'The default width of a file node.',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      defaultFileNodeHeight: {
        label: 'Default file node height',
        description: 'The default height of a file node.',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      minNodeSize: {
        label: 'Minimum node size',
        description: 'The minimum size of a node.',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      disableFontSizeRelativeToZoom: {
        label: 'Disable font size relative to zoom',
        description: 'When enabled, the font size of e.g. group node titles and edge labels will not increase when zooming out.',
        type: 'boolean'
      }
    }
  },
  combineCustomStylesInDropdown: {
    label: 'Combine custom styles',
    description: 'Combine all style attributes of Advanced Canvas in a single dropdown.',
    children: { }
  },
  nodeStylingFeatureEnabled: {
    label: 'Node styling',
    description: 'Style your nodes with different shapes and borders.',
    children: {
      customNodeStyleAttributes: {
        label: 'Custom node style settings',
        description: 'Add custom style settings for nodes. (Go to GitHub for more information)',
        type: 'button',
        onClick: () => window.open("https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/README.md#custom-styles")
      } as ButtonSetting,
      defaultTextNodeStyleAttributes: {
        label: 'Default text node style attributes',
        type: 'styles',
        getParameters(settingsManager) {
          return [ ...BUILTIN_NODE_STYLE_ATTRIBUTES, ...settingsManager.getSetting('customNodeStyleAttributes') ]
            .filter((setting) => setting.nodeTypes === undefined || setting.nodeTypes?.includes('text'))
        }
      } as StyleAttributesSetting
    }
  },
  edgesStylingFeatureEnabled: {
    label: 'Edges styling',
    description: 'Style your edges with different path styles.',
    children: {
      customEdgeStyleAttributes: {
        label: 'Custom edge style settings',
        description: 'Add custom style settings for edges. (Go to GitHub for more information)',
        type: 'button',
        onClick: () => window.open("https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/README.md#custom-styles")
      } as ButtonSetting,
      defaultEdgeLineDirection: {
        label: 'Default edge line direction',
        description: 'The default line direction of an edge.',
        type: 'dropdown',
        options: {
          'nondirectional': 'Nondirectional',
          'unidirectional': 'Unidirectional',
          'bidirectional': 'Bidirectional'
        }
      } as DropdownSetting,
      defaultEdgeStyleAttributes: {
        label: 'Default edge style attributes',
        type: 'styles',
        getParameters(settingsManager) {
          return [ ...BUILTIN_EDGE_STYLE_ATTRIBUTES, ...settingsManager.getSetting('customEdgeStyleAttributes') ]
        }
      } as StyleAttributesSetting,
      edgeStyleUpdateWhileDragging: {
        label: 'Update edge style while dragging (Can be very slow)',
        description: 'When enabled, the edge style will be updated while dragging an edge.',
        type: 'boolean'
      },
      edgeStyleDirectRotateArrow: {
        label: 'Rotate arrow if pathfinding method is "Direct"',
        description: 'When enabled, the arrow will be rotated to the direction of the edge if the pathfinding method is set to "Direct".',
        type: 'boolean'
      },
      edgeStylePathfinderGridResolution: {
        label: 'A* grid resolution',
        description: 'The resolution of the grid when using the A* path style. The lower the value, the more precise the path will be. But it will also take longer to calculate.',
        type: 'number',
        parse: (value: string) => Math.max(5, parseInt(value) || 0)
      },
      edgeStylePathfinderPathRounded: {
        label: 'A* rounded path',
        description: 'When enabled, the A* path style will be rounded.',
        type: 'boolean'
      }
    }
  },
  variableBreakpointFeatureEnabled: {
    label: 'Variable breakpoint',
    description: `Change the zoom breakpoint (the zoom level at which the nodes won't render their content anymore) on a per-node basis using the ${VARIABLE_BREAKPOINT_CSS_VAR} CSS variable.`,
    children: { }
  },
  commandsFeatureEnabled: {
    label: 'Extended commands',
    description: 'Add more commands to the canvas.',
    children: {
      zoomToClonedNode: {
        label: 'Zoom to cloned node',
        description: 'When enabled, the canvas will zoom to the cloned node.',
        type: 'boolean'
      },
      cloneNodeMargin: {
        label: 'Clone node margin',
        description: 'The margin between the cloned node and the source node.',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      expandNodeStepSize: {
        label: 'Expand node step size',
        description: 'The step size for expanding the node.',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      }
    }
  },
  flipEdgeFeatureEnabled: {
    label: 'Flip edges',
    description: 'Flip the direction of edges using the popup menu.',
    children: { }
  },
  betterReadonlyEnabled: {
    label: 'Better readonly',
    description: 'Improve the readonly mode.',
    children: {
      disableNodePopup: {
        label: 'Disable node popup',
        description: 'When enabled, the node popup will be disabled.',
        type: 'boolean'
      },
      disableZoom: {
        label: 'Disable zoom',
        description: 'When enabled, zooming will be disabled.',
        type: 'boolean'
      },
      disablePan: {
        label: 'Disable pan',
        description: 'When enabled, panning will be disabled.',
        type: 'boolean'
      }
    }
  },
  autoResizeNodeFeatureEnabled: {
    label: 'Auto resize node',
    description: 'Automatically resize the height of a node to fit the content.',
    children: {
      autoResizeNodeEnabledByDefault: {
        label: 'Enable auto resize by default',
        description: 'When enabled, the auto resize feature will be enabled by default for all nodes.',
        type: 'boolean'
      },
      autoResizeNodeMaxHeight: {
        label: 'Max height',
        description: 'The maximum height of the node when auto resizing (-1 for unlimited).',
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) ?? -1)
      },
      autoResizeNodeSnapToGrid: {
        label: 'Snap to grid',
        description: 'When enabled, the height of the node will snap to the grid.',
        type: 'boolean'
      }
    }
  },
  collapsibleGroupsFeatureEnabled: {
    label: 'Collapsible groups',
    description: 'Group nodes can be collapsed and expanded to keep the canvas organized.',
    children: {
      collapsedGroupPreviewOnDrag: {
        label: 'Collapsed group preview on drag',
        description: 'When enabled, a group that is collapsed show its border while dragging a node.',
        type: 'boolean'
      }
    }
  },
  focusModeFeatureEnabled: {
    label: 'Focus mode',
    description: 'Focus on a single node and blur all other nodes.',
    children: { }
  },
  presentationFeatureEnabled: {
    label: 'Presentations',
    description: 'Create a presentation from your canvas.',
    children: {
      showSetStartNodeInPopup: {
        label: 'Show "Set Start Node" in node popup',
        description: 'If turned off, you can still set the start node using the corresponding command.',
        type: 'boolean'
      },
      defaultSlideSize: {
        label: 'Default slide ratio',
        description: 'The default ratio of the slide. For example, 16:9 is 1200x675 and 3:2 is 1350x900.',
        type: 'text'
      },
      wrapInSlidePadding: {
        label: 'Wrap in slide padding',
        description: 'The padding of the slide when wrapping the canvas in a slide.',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      resetViewportOnPresentationEnd: {
        label: 'Reset viewport on presentation end',
        description: 'When enabled, the viewport will be reset to the original position after the presentation ends.',
        type: 'boolean'
      },
      useArrowKeysToChangeSlides: {
        label: 'Use arrow keys to change slides',
        description: 'When enabled, you can use the arrow keys to change slides in presentation mode.',
        type: 'boolean'
      },
      usePgUpPgDownKeysToChangeSlides: {
        label: 'Use PgUp/PgDown keys to change slides',
        description: 'When enabled, you can use the PgUp/PgDown keys to change slides in presentation mode (Makes the presentation mode compatible with most presentation remotes).',
        type: 'boolean'
      },
      zoomToSlideWithoutPadding: {
        label: 'Zoom to slide without padding',
        description: 'When enabled, the canvas will zoom to the slide without padding.',
        type: 'boolean'
      },
      slideTransitionAnimationDuration: {
        label: 'Slide transition animation duration',
        description: 'The duration of the slide transition animation in seconds. Set to 0 to disable the animation.',
        type: 'number',
        parse: (value: string) => Math.max(0, parseFloat(value) || 0)
      },
      slideTransitionAnimationIntensity: {
        label: 'Slide transition animation intensity',
        description: 'The intensity of the slide transition animation. The higher the value, the more the canvas will zoom out before zooming in on the next slide.',
        type: 'number',
        parse: (value: string) => Math.max(0, parseFloat(value) || 0)
      }
    }
  },
  canvasEncapsulationEnabled: {
    label: 'Canvas encapsulation',
    description: 'Encapsulate a selection of nodes and edges into a new canvas.',
    children: { }
  },
  portalsFeatureEnabled: {
    label: 'Portals',
    description: 'Create portals to other canvases.',
    children: {
      maintainClosedPortalSize: {
        label: 'Maintain closed portal size',
        description: 'When enabled, the portal will maintain its size when closed.',
        type: 'boolean'
      },
      showEdgesIntoDisabledPortals: {
        label: 'Show edges into disabled portals',
        description: 'When enabled, edges into disabled portals will be shown.',
        type: 'boolean'
      }
    }
  }
} as const satisfies {
  [key in keyof AdvancedCanvasPluginSettingsValues]: ValidSettingsHeading
}

export const DEFAULT_SETTINGS_VALUES: AdvancedCanvasPluginSettingsValues = {
  downloadTimestamp: new Date().getTime(),
  askedForDonation: false,

  nodeTypeOnDoubleClick: 'text',
  alignNewNodesToGrid: true,
  defaultTextNodeWidth: 260,
  defaultTextNodeHeight: 60,
  defaultFileNodeWidth: 400,
  defaultFileNodeHeight: 400,
  minNodeSize: 60,
  disableFontSizeRelativeToZoom: false,

  combineCustomStylesInDropdown: false,

  nodeStylingFeatureEnabled: true,
  customNodeStyleAttributes: [],
  defaultTextNodeStyleAttributes: {},

  edgesStylingFeatureEnabled: true,
  customEdgeStyleAttributes: [],
  defaultEdgeLineDirection: 'unidirectional',
  defaultEdgeStyleAttributes: {},
  edgeStyleUpdateWhileDragging: false,
  edgeStyleDirectRotateArrow: false,
  edgeStylePathfinderGridResolution: 10,
  edgeStylePathfinderPathRounded: true,

  variableBreakpointFeatureEnabled: true,

  commandsFeatureEnabled: true,
  zoomToClonedNode: true,
  cloneNodeMargin: 20,
  expandNodeStepSize: 20,

  flipEdgeFeatureEnabled: true,

  betterReadonlyEnabled: true,
  disableNodePopup: false,
  disableZoom: false,
  disablePan: false,

  autoResizeNodeFeatureEnabled: false,
  autoResizeNodeEnabledByDefault: false,
  autoResizeNodeMaxHeight: -1,
  autoResizeNodeSnapToGrid: true,

  collapsibleGroupsFeatureEnabled: true,
  collapsedGroupPreviewOnDrag: true,

  focusModeFeatureEnabled: true,

  presentationFeatureEnabled: true,
  showSetStartNodeInPopup: false,
  defaultSlideSize: '1200x675',
  wrapInSlidePadding: 20,
  resetViewportOnPresentationEnd: true,
  useArrowKeysToChangeSlides: true,
  usePgUpPgDownKeysToChangeSlides: true,
  zoomToSlideWithoutPadding: true,
  slideTransitionAnimationDuration: 0.5,
  slideTransitionAnimationIntensity: 1.25,

  canvasEncapsulationEnabled: true,

  portalsFeatureEnabled: true,
  maintainClosedPortalSize: true,
  showEdgesIntoDisabledPortals: true
}

export default class SettingsManager {
  static SETTINGS_CHANGED_EVENT = 'advanced-canvas:settings-changed'

  private plugin: AdvancedCanvasPlugin
  private settings: AdvancedCanvasPluginSettingsValues
  private settingsTab: AdvancedCanvasPluginSettingTab

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS_VALUES, await this.plugin.loadData())
    this.plugin.app.workspace.trigger(SettingsManager.SETTINGS_CHANGED_EVENT)
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
    this.plugin.app.workspace.trigger(SettingsManager.SETTINGS_CHANGED_EVENT)
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

  display(): void {
    let { containerEl } = this
    containerEl.empty()

    // Generate settings from SETTINGS object
    for (const [headingId, heading] of Object.entries(SETTINGS) as [string, SettingsHeading][]) {
      this.createFeatureHeading(
        containerEl, 
        heading.label, 
        heading.description, 
        heading.disableToggle ? null : headingId as keyof AdvancedCanvasPluginSettingsValues
      )

      for (let [settingId, setting] of Object.entries(heading.children) as [keyof AdvancedCanvasPluginSettingsValues, Setting][]) {
        if (!(settingId in DEFAULT_SETTINGS_VALUES)) continue

        switch (setting.type) {
          case 'text':
            this.createTextSetting(containerEl, settingId, setting as TextSetting)
            break
          case 'number':
            this.createNumberSetting(containerEl, settingId, setting as NumberSetting)
            break
          case 'boolean':
            this.createBooleanSetting(containerEl, settingId, setting as BooleanSetting)
            break
          case 'dropdown':
            this.createDropdownSetting(containerEl, settingId, setting as DropdownSetting)
            break
          case 'button':
            this.createButtonSetting(containerEl, settingId, setting as ButtonSetting)
            break
          case 'styles':
            this.createStylesSetting(containerEl, settingId, setting as StyleAttributesSetting)
            break
        }
      }
    }

    this.createKoFiBadge(containerEl)

    const currentTimestamp = new Date().getTime()
    if (currentTimestamp - this.settingsManager.getSetting('downloadTimestamp') > ASK_FOR_DONATION_DELAY
      && !this.settingsManager.getSetting('askedForDonation')) {

      this.createKoFiOverlay(containerEl)
    }
  }

  private createFeatureHeading(containerEl: HTMLElement, label: string, description: string, settingsKey: keyof AdvancedCanvasPluginSettingsValues | null): SettingEl {
    if (settingsKey === null) {
      return new SettingEl(containerEl)
        .setHeading()
        .setClass('ac-settings-heading')
        .setName("General")
    }

    return new SettingEl(containerEl)
      .setHeading()
      .setClass('ac-settings-heading')
      .setName(label)
      .setDesc(description)
      .addToggle((toggle) =>
        toggle
          .setTooltip("Requires a reload to take effect.")
          .setValue(this.settingsManager.getSetting(settingsKey) as boolean)
          .onChange(async (value) => {
            await this.settingsManager.setSetting({ [settingsKey]: value })
            new Notice("Reload obsidian to apply the changes.")
          })
      )
  }

  private createTextSetting(containerEl: HTMLElement, settingId: keyof AdvancedCanvasPluginSettingsValues, setting: TextSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(this.settingsManager.getSetting(settingId) as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse ? setting.parse(value) : value })
        })
      )
  }

  private createNumberSetting(containerEl: HTMLElement, settingId: keyof AdvancedCanvasPluginSettingsValues, setting: NumberSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(this.settingsManager.getSetting(settingId).toString())
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse(value) })
        })
      )
  }

  private createBooleanSetting(containerEl: HTMLElement, settingId: keyof AdvancedCanvasPluginSettingsValues, setting: BooleanSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addToggle(toggle => toggle
        .setValue(this.settingsManager.getSetting(settingId) as boolean)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      )
  }

  private createDropdownSetting(containerEl: HTMLElement, settingId: keyof AdvancedCanvasPluginSettingsValues, setting: DropdownSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addDropdown(dropdown => dropdown
        .addOptions(setting.options)
        .setValue(this.settingsManager.getSetting(settingId) as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      )
  }

  private createButtonSetting(containerEl: HTMLElement, settingId: keyof AdvancedCanvasPluginSettingsValues, setting: ButtonSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addButton(button => button
        .setButtonText('Open')
        .onClick(() => setting.onClick())
      )
  }

  private createStylesSetting(containerEl: HTMLElement, settingId: keyof AdvancedCanvasPluginSettingsValues, setting: StyleAttributesSetting) {
    const nestedContainerEl = document.createElement('details')
    nestedContainerEl.classList.add('setting-item')
    containerEl.appendChild(nestedContainerEl)

    const summaryEl = document.createElement('summary')
    summaryEl.textContent = setting.label
    nestedContainerEl.appendChild(summaryEl)

    for (const styleAttribute of setting.getParameters(this.settingsManager)) {
      new SettingEl(nestedContainerEl)
        .setName(styleAttribute.label)
        .addDropdown(dropdown => dropdown
          .addOptions(Object.fromEntries(styleAttribute.options.map(option => [option.value, option.value === null ? `${option.label} (default)` : option.label])))
          .setValue((this.settingsManager.getSetting(settingId) as { [key: string]: string })[styleAttribute.datasetKey] ?? 'null')
          .onChange(async (value) => {
            const newValue = this.settingsManager.getSetting(settingId) as { [key: string]: string }

            if (value === 'null') delete newValue[styleAttribute.datasetKey]
            else newValue[styleAttribute.datasetKey] = value

            await this.settingsManager.setSetting({
              [settingId]: newValue
            })
          })
        )
    }
  }

  private async createKoFiOverlay(containerEl: HTMLElement) {
    const sidebarWidth = containerEl.parentElement?.previousElementSibling?.clientWidth ?? 0
    const overlay = document.createElement('div')
    overlay.classList.add('kofi-overlay')
    overlay.style.left = `${sidebarWidth}px`

    const dismiss = () => {
      overlay.remove()
      this.settingsManager.setSetting({ askedForDonation: true })
    }

    const title = document.createElement('h1')
    title.textContent = 'Enjoying the plugin?'
    overlay.appendChild(title)

    const description = document.createElement('p')
    description.innerHTML = `Currently, Advanced Canvas has received <b>~${RECEIVED_DONATIONS}$</b> in donations with a total of <b>~${SPENT_HOURS} hours</b> spent on development.`
    overlay.appendChild(description)

    const hourlyRate = document.createElement('progress')
    hourlyRate.value = RECEIVED_DONATIONS / SPENT_HOURS
    hourlyRate.max = HOURLY_RATE_GOAL
    overlay.appendChild(hourlyRate)

    const targetDescription = document.createElement('p')
    targetDescription.innerHTML = `Please help me develop this plugin further by reaching the goal of <b>${HOURLY_RATE_GOAL}$/hour</b>.`
    overlay.appendChild(targetDescription)

    const koFiButton = document.createElement('a')
    koFiButton.classList.add('kofi-button')
    koFiButton.href = KOFI_PAGE_URL
    koFiButton.target = '_blank'
    koFiButton.addEventListener('click', dismiss)

    const koFiImage = document.createElement('img')
    koFiImage.src = KOFI_BADGE_URI

    koFiButton.appendChild(koFiImage)
    overlay.appendChild(koFiButton)

    const noButton = document.createElement('button')
    noButton.classList.add('no-button')
    noButton.textContent = "I don't want to help"
    noButton.addEventListener('click', dismiss)
    overlay.appendChild(noButton)

    containerEl.appendChild(overlay)
  }

  private createKoFiBadge(containerEl: HTMLElement) {
    const koFiButton = document.createElement('a')
    koFiButton.classList.add('kofi-button')
    koFiButton.classList.add('sticky')
    koFiButton.href = KOFI_PAGE_URL
    koFiButton.target = '_blank'

    const koFiImage = document.createElement('img')
    koFiImage.src = KOFI_BADGE_URI

    koFiButton.appendChild(koFiImage)
    containerEl.appendChild(koFiButton)
  }
}
