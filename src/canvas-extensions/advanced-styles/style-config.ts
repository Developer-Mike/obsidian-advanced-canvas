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
  icon?: string
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

export const BUILTIN_NODE_STYLE_ATTRIBUTES: StyleAttribute[] = [
  {
    key: 'textAlign',
    icon: 'align-left',
    label: t({ en: 'Text Alignment', zh: '文本对齐' }),
    nodeTypes: ['text'],
    options: [
      {
        icon: 'align-left',
        label: t({ en: 'Left', zh: '左' }),
        value: null
      },
      {
        icon: 'align-center',
        label: t({ en: 'Center', zh: '中' }),
        value: 'center'
      },
      {
        icon: 'align-right',
        label: t({ en: 'Right', zh: '右' }),
        value: 'right'
      }
    ]
  },
  {
    key: 'shape',
    icon: 'shapes',
    label: t({ en: 'Shape', zh: '形状' }),
    nodeTypes: ['text'],
    options: [
      {
        icon: 'rectangle-horizontal',
        label: t({ en: 'Round Rectangle', zh: '圆角矩形' }),
        value: null
      },
      {
        icon: 'shape-pill',
        label: t({ en: 'Pill', zh: '胶囊形' }),
        value: 'pill'
      },
      {
        icon: 'diamond',
        label: t({ en: 'Diamond', zh: '菱形' }),
        value: 'diamond'
      },
      {
        icon: 'shape-parallelogram',
        label: t({ en: 'Parallelogram', zh: '平行四边形' }),
        value: 'parallelogram'
      },
      {
        icon: 'circle',
        label: t({ en: 'Circle', zh: '圆形' }),
        value: 'circle'
      },
      {
        icon: 'shape-predefined-process',
        label: t({ en: 'Predefined Process', zh: '预定义流程' }),
        value: 'predefined-process'
      },
      {
        icon: 'shape-document',
        label: t({ en: 'Document', zh: '文档' }),
        value: 'document'
      },
      {
        icon: 'shape-database',
        label: t({ en: 'Database', zh: '数据库' }),
        value: 'database'
      }
    ]
  },
  {
    key: 'border',
    icon: 'square-dashed-bottom',
    label: t({ en: 'Border', zh: '边框' }),
    options: [
      {
        icon: 'border-solid',
        label: t({ en: 'Solid', zh: '实线' }),
        value: null
      },
      {
        icon: 'border-dashed',
        label: t({ en: 'Dashed', zh: '虚线' }),
        value: 'dashed'
      },
      {
        icon: 'border-dotted',
        label: t({ en: 'Dotted', zh: '点线' }),
        value: 'dotted'
      },
      {
        icon: 'eye-off',
        label: t({ en: 'Invisible', zh: '不可见' }),
        value: 'invisible'
      }
    ]
  }
] satisfies StyleAttribute[]

export const BUILTIN_EDGE_STYLE_ATTRIBUTES: StyleAttribute[] = [
  {
    key: 'path',
    icon: 'path-solid',
    label: t({ en: 'Path Style', zh: '路径样式' }),
    options: [
      {
        icon: 'path-solid',
        label: t({ en: 'Solid', zh: '实线' }),
        value: null
      },
      {
        icon: 'path-dotted',
        label: t({ en: 'Dotted', zh: '点线' }),
        value: 'dotted'
      },
      {
        icon: 'path-short-dashed',
        label: t({ en: 'Short Dashed', zh: '短虚线' }),
        value: 'short-dashed'
      },
      {
        icon: 'path-long-dashed',
        label: t({ en: 'Long Dashed', zh: '长虚线' }),
        value: 'long-dashed'
      }
    ]
  },
  {
    key: 'arrow',
    icon: 'play',
    label: t({ en: 'Arrow Style', zh: '箭头样式' }),
    options: [
      {
        icon: 'arrow-triangle',
        label: t({ en: 'Triangle', zh: '三角形' }),
        value: null
      },
      {
        icon: 'arrow-triangle-outline',
        label: t({ en: 'Triangle Outline', zh: '三角轮廓' }),
        value: 'triangle-outline'
      },
      {
        icon: 'arrow-thin-triangle',
        label: t({ en: 'Thin Triangle', zh: '细三角' }),
        value: 'thin-triangle'
      },
      {
        icon: 'arrow-halved-triangle',
        label: t({ en: 'Halved Triangle', zh: '半三角' }),
        value: 'halved-triangle'
      },
      {
        icon: 'arrow-diamond',
        label: t({ en: 'Diamond', zh: '菱形' }),
        value: 'diamond'
      },
      {
        icon: 'arrow-diamond-outline',
        label: t({ en: 'Diamond Outline', zh: '菱形轮廓' }),
        value: 'diamond-outline'
      },
      {
        icon: 'arrow-circle',
        label: t({ en: 'Circle', zh: '圆形' }),
        value: 'circle'
      },
      {
        icon: 'arrow-circle-outline',
        label: t({ en: 'Circle Outline', zh: '圆形轮廓' }),
        value: 'circle-outline'
      },
      {
        icon: 'tally-1',
        label: t({ en: 'Blunt', zh: '平头' }),
        value: 'blunt'
      }
    ]
  },
  {
    key: 'pathfindingMethod',
    icon: 'pathfinding-method-square',
    label: t({ en: 'Pathfinding Method', zh: '寻路方式' }),
    options: [
      {
        icon: 'pathfinding-method-bezier',
        label: t({ en: 'Bezier', zh: '贝塞尔' }),
        value: null
      },
      {
        icon: 'slash',
        label: t({ en: 'Direct', zh: '直线' }),
        value: 'direct'
      },
      {
        icon: 'pathfinding-method-square',
        label: t({ en: 'Square', zh: '方形' }),
        value: 'square'
      },
      {
        icon: 'map',
        label: t({ en: 'A*', zh: 'A*' }),
        value: 'a-star'
      }
    ]
  }
] satisfies StyleAttribute[]
