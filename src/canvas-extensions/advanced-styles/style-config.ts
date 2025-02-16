import { CanvasNodeType } from "src/@types/Canvas"

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

export function styleAttributeValidator(json: Record<string, any>): boolean {
  return (
    json.key !== undefined &&
    json.label !== undefined &&
    Array.isArray(json.options) &&
    json.options.every(option => 
      option.icon !== undefined &&
      option.label !== undefined &&
      option.value !== undefined
    )
  )
}

export const BUILTIN_NODE_STYLE_ATTRIBUTES = [
  {
    key: 'textAlign',
    label: 'Text Alignment',
    nodeTypes: ['text'],
    options: [
      {
        icon: 'align-left',
        label: 'Left',
        value: null
      },
      {
        icon: 'align-center',
        label: 'Center',
        value: 'center'
      },
      {
        icon: 'align-right',
        label: 'Right',
        value: 'right'
      }
    ]
  },
  {
    key: 'shape',
    label: 'Shape',
    nodeTypes: ['text'],
    options: [
      {
        icon: 'rectangle-horizontal',
        label: 'Round Rectangle',
        value: null
      },
      {
        icon: 'shape-pill',
        label: 'Pill',
        value: 'pill'
      },
      {
        icon: 'diamond',
        label: 'Diamond',
        value: 'diamond'
      },
      {
        icon: 'shape-parallelogram',
        label: 'Parallelogram',
        value: 'parallelogram'
      },
      {
        icon: 'circle',
        label: 'Circle',
        value: 'circle'
      },
      {
        icon: 'shape-predefined-process',
        label: 'Predefined Process',
        value: 'predefined-process'
      },
      {
        icon: 'shape-document',
        label: 'Document',
        value: 'document'
      },
      {
        icon: 'shape-database',
        label: 'Database',
        value: 'database'
      }
    ]
  },
  {
    key: 'border',
    label: 'Border',
    options: [
      {
        icon: 'border-solid',
        label: 'Solid',
        value: null
      },
      {
        icon: 'border-dashed',
        label: 'Dashed',
        value: 'dashed'
      },
      {
        icon: 'border-dotted',
        label: 'Dotted',
        value: 'dotted'
      },
      {
        icon: 'eye-off',
        label: 'Invisible',
        value: 'invisible'
      }
    ]
  }
] as StyleAttribute[]

export const BUILTIN_EDGE_STYLE_ATTRIBUTES = [
  {
    key: 'path',
    label: 'Path Style',
    options: [
      {
        icon: 'path-solid',
        label: 'Solid',
        value: null
      },
      {
        icon: 'path-dotted',
        label: 'Dotted',
        value: 'dotted'
      },
      {
        icon: 'path-short-dashed',
        label: 'Short Dashed',
        value: 'short-dashed'
      },
      {
        icon: 'path-long-dashed',
        label: 'Long Dashed',
        value: 'long-dashed'
      }
    ]
  },
  {
    key: 'arrow',
    label: 'Arrow Style',
    options: [
      {
        icon: 'arrow-triangle',
        label: 'Triangle',
        value: null
      },
      {
        icon: 'arrow-triangle-outline',
        label: 'Triangle Outline',
        value: 'triangle-outline'
      },
      {
        icon: 'arrow-thin-triangle',
        label: 'Thin Triangle',
        value: 'thin-triangle'
      },
      {
        icon: 'arrow-halved-triangle',
        label: 'Halved Triangle',
        value: 'halved-triangle'
      },
      {
        icon: 'arrow-diamond',
        label: 'Diamond',
        value: 'diamond'
      },
      {
        icon: 'arrow-diamond-outline',
        label: 'Diamond Outline',
        value: 'diamond-outline'
      },
      {
        icon: 'arrow-circle',
        label: 'Circle',
        value: 'circle'
      },
      {
        icon: 'arrow-circle-outline',
        label: 'Circle Outline',
        value: 'circle-outline'
      }
    ]
  },
  {
    key: 'pathfindingMethod',
    label: 'Pathfinding Method',
    options: [
      {
        icon: 'pathfinding-method-bezier',
        label: 'Bezier',
        value: null
      },
      {
        icon: 'slash',
        label: 'Direct',
        value: 'direct'
      },
      {
        icon: 'pathfinding-method-square',
        label: 'Square',
        value: 'square'
      },
      {
        icon: 'map',
        label: 'A*',
        value: 'a-star'
      }
    ]
  }
] as StyleAttribute[]