import { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"
import SettingsManager from "src/settings"

export interface SettingsHeading {
  label: string
  description: string
  infoSection?: string
  disableToggle?: boolean

  children: { [id: string]: Setting }
}

export interface Setting {
  label: string
  description: string
  type: null | 'text' | 'number' | 'dimension' | 'boolean' | 'dropdown' | 'button' | 'styles'

  parse?: (value: any) => any
}

export interface StyleAttributesSetting extends Setting {
  type: 'styles'
  description: ""
  getParameters: (settingsManager: SettingsManager) => StyleAttribute[]
}

export interface TextSetting extends Setting {
  type: 'text'
}

export interface NumberSetting extends Setting {
  type: 'number'
  parse: (value: string) => number
}

export interface DimensionSetting extends Setting {
  type: 'dimension'
  parse: (value: [string, string]) => [number, number]
}

export interface BooleanSetting extends Setting {
  type: 'boolean'
}

export interface DropdownSetting extends Setting {
  type: 'dropdown'
  options: { [id: string]: string }
}

export interface ButtonSetting extends Setting {
  type: 'button'
  onClick: () => any
}