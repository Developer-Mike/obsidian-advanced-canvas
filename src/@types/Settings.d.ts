import { StyleAttribute } from "src/canvas-extensions/advanced-styles/style-config"
import SettingsManager from "src/settings"

export interface SettingsHeading {
  label: string
  description: string

  enabledByDefault: boolean
  alwaysEnabled?: boolean

  children: { [id: string]: Setting }
}

export interface Setting {
  label: string
  description: string
  type: null | 'text' | 'number' | 'boolean' | 'dropdown' | 'button' | 'styles'

  defaultValue: any
  parse?: (value: any) => any
}

export interface StyleAttributesSetting extends Setting {
  type: 'styles'
  description: ""
  defaultValue: { [id: string]: any }
  getParameters: (settingsManager: SettingsManager) => StyleAttribute[]
}

export interface TextSetting extends Setting {
  type: 'text'
  defaultValue: string
}

export interface NumberSetting extends Setting {
  type: 'number'
  defaultValue: number
  parse: (value: string) => number
}

export interface BooleanSetting extends Setting {
  type: 'boolean'
  defaultValue: boolean
}

export interface DropdownSetting extends Setting {
  type: 'dropdown'
  options: DropdownOption[]
}

export interface DropdownOption {
  value: string
  label: string
}

export interface ButtonSetting extends Setting {
  type: 'button'
  onClick: () => any
}