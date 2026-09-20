import { CanvasNodeType } from "src/@types/AdvancedJsonCanvas"
import t from "src/utils/i18n"
import TextHelper from "src/utils/text-helper"

export interface StyleAttributeOption {
  icon: string
  label: string
  value: string | null // The element with the null value is the default
}

export interface StyleAttribute {
  key: string
  label: string
  nodeTypes?: CanvasNodeType[]
  options: StyleAttributeOption[]
}

export function styleAttributeValidator(json: Record<string, unknown>): StyleAttribute | null {
  const hasKey = json.key !== undefined
  const hasLabel = json.label !== undefined
  const hasOptions = Array.isArray(json.options)

  if (!hasKey) console.error('Style attribute is missing the "key" property')
  if (!hasLabel) console.error('Style attribute is missing the "label" property')
  if (!hasOptions) console.error('Style attribute is missing the "options" property or it is not an array')

  json.key = TextHelper.toCamelCase(json.key as string)

  let optionsValid = true
  let hasDefault = false
  for (const option of json.options as Record<string, unknown>[]) {
    const hasIcon = option.icon !== undefined
    const hasLabel = option.label !== undefined
    const hasValue = option.value !== undefined

    if (!hasIcon) console.error(`Style attribute option (${String(option.value ?? option.label)}) is missing the "icon" property`)
    if (!hasLabel) console.error(`Style attribute option (${String(option.value)}) is missing the "label" property`)
    if (!hasValue) console.error(`Style attribute option (${String(option.label)}) is missing the "value" property`)

    if (!hasIcon || !hasLabel || !hasValue) optionsValid = false
    if (option.value === null) hasDefault = true
  }
  if (!hasDefault) console.error('Style attribute is missing a default option (option with a "value" of null)')

  const isValid = hasKey && hasLabel && hasOptions && optionsValid && hasDefault
  return isValid ? json as unknown as StyleAttribute : null
}

export const BUILTIN_NODE_STYLE_ATTRIBUTES = [
  {
    key: 'textAlign',
    label: t({ en: 'Text Alignment' }),
    nodeTypes: ['text'],
    options: [
      {
        icon: 'align-left',
        label: t({ en: 'Left' }),
        value: null
      },
      {
        icon: 'align-center',
        label: t({ en: 'Center' }),
        value: 'center'
      },
      {
        icon: 'align-right',
        label: t({ en: 'Right' }),
        value: 'right'
      }
    ]
  },
  {
    key: 'shape',
    label: t({ en: 'Shape' }),
    nodeTypes: ['text'],
    options: [
      {
        icon: 'rectangle-horizontal',
        label: t({ en: 'Round Rectangle' }),
        value: null
      },
      {
        icon: 'shape-pill',
        label: t({ en: 'Pill' }),
        value: 'pill'
      },
      {
        icon: 'diamond',
        label: t({ en: 'Diamond' }),
        value: 'diamond'
      },
      {
        icon: 'shape-parallelogram',
        label: t({ en: 'Parallelogram' }),
        value: 'parallelogram'
      },
      {
        icon: 'circle',
        label: t({ en: 'Circle' }),
        value: 'circle'
      },
      {
        icon: 'shape-predefined-process',
        label: t({ en: 'Predefined Process' }),
        value: 'predefined-process'
      },
      {
        icon: 'shape-document',
        label: t({ en: 'Document' }),
        value: 'document'
      },
      {
        icon: 'shape-database',
        label: t({ en: 'Database' }),
        value: 'database'
      }
    ]
  },
  {
    key: 'border',
    label: t({ en: 'Border' }),
    options: [
      {
        icon: 'border-solid',
        label: t({ en: 'Solid' }),
        value: null
      },
      {
        icon: 'border-dashed',
        label: t({ en: 'Dashed' }),
        value: 'dashed'
      },
      {
        icon: 'border-dotted',
        label: t({ en: 'Dotted' }),
        value: 'dotted'
      },
      {
        icon: 'eye-off',
        label: t({ en: 'Invisible' }),
        value: 'invisible'
      }
    ]
  }
] as StyleAttribute[]

export const BUILTIN_EDGE_STYLE_ATTRIBUTES = [
  {
    key: 'path',
    label: t({ en: 'Path Style' }),
    options: [
      {
        icon: 'path-solid',
        label: t({ en: 'Solid' }),
        value: null
      },
      {
        icon: 'path-dotted',
        label: t({ en: 'Dotted' }),
        value: 'dotted'
      },
      {
        icon: 'path-short-dashed',
        label: t({ en: 'Short Dashed' }),
        value: 'short-dashed'
      },
      {
        icon: 'path-long-dashed',
        label: t({ en: 'Long Dashed' }),
        value: 'long-dashed'
      }
    ]
  },
  {
    key: 'arrow',
    label: t({ en: 'Arrow Style' }),
    options: [
      {
        icon: 'arrow-triangle',
        label: t({ en: 'Triangle' }),
        value: null
      },
      {
        icon: 'arrow-triangle-outline',
        label: t({ en: 'Triangle Outline' }),
        value: 'triangle-outline'
      },
      {
        icon: 'arrow-thin-triangle',
        label: t({ en: 'Thin Triangle' }),
        value: 'thin-triangle'
      },
      {
        icon: 'arrow-halved-triangle',
        label: t({ en: 'Halved Triangle' }),
        value: 'halved-triangle'
      },
      {
        icon: 'arrow-diamond',
        label: t({ en: 'Diamond' }),
        value: 'diamond'
      },
      {
        icon: 'arrow-diamond-outline',
        label: t({ en: 'Diamond Outline' }),
        value: 'diamond-outline'
      },
      {
        icon: 'arrow-circle',
        label: t({ en: 'Circle' }),
        value: 'circle'
      },
      {
        icon: 'arrow-circle-outline',
        label: t({ en: 'Circle Outline' }),
        value: 'circle-outline'
      },
      {
        icon: 'tally-1',
        label: t({ en: 'Blunt' }),
        value: 'blunt'
      }
    ]
  },
  {
    key: 'pathfindingMethod',
    label: t({ en: 'Pathfinding Method' }),
    options: [
      {
        icon: 'pathfinding-method-bezier',
        label: t({ en: 'Bezier' }),
        value: null
      },
      {
        icon: 'slash',
        label: t({ en: 'Direct' }),
        value: 'direct'
      },
      {
        icon: 'pathfinding-method-square',
        label: t({ en: 'Square' }),
        value: 'square'
      },
      {
        icon: 'map',
        label: t({ en: 'A*' }),
        value: 'a-star'
      }
    ]
  }
] as StyleAttribute[]
