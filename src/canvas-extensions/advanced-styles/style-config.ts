import { CanvasNodeType } from "src/@types/Canvas"

export interface StylableAttributeOption {
  icon: string
  label: string
  value: string | null // The element with the null value is the default
}

export interface StylableAttribute {
  datasetKey: string
  label: string
  nodeTypes?: CanvasNodeType[]
  options: StylableAttributeOption[]
}

export const DEFAULT_NODE_STYLE_SETTINGS = [
  {
    datasetKey: 'textAlign',
    label: 'Text Alignment',
    nodeTypes: ['text'],
    options: [
      {
        icon: 'align-left',
        label: 'Left (default)',
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
    datasetKey: 'shape',
    label: 'Shape',
    nodeTypes: ['text'],
    options: [
      {
        icon: 'rectangle-horizontal',
        label: 'Round Rectangle (default)',
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
    datasetKey: 'border',
    label: 'Border',
    options: [
      {
        icon: 'border-solid',
        label: 'Solid (default)',
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
] as StylableAttribute[]

export const DEFAULT_EDGE_STYLE_SETTINGS = [
  {
    datasetKey: 'edge',
    label: 'Edge Style',
    options: [
      {
        icon: 'edge-solid',
        label: 'Solid (default)',
        value: null
      },
      {
        icon: 'edge-dotted',
        label: 'Dotted',
        value: 'dotted'
      },
      {
        icon: 'edge-short-dashed',
        label: 'Short Dashed',
        value: 'short-dashed'
      },
      {
        icon: 'edge-long-dashed',
        label: 'Long Dashed',
        value: 'long-dashed'
      }
    ]
  },
  {
    datasetKey: 'arrow',
    label: 'Arrow Style',
    options: [
      {
        icon: 'arrow-triangle',
        label: 'Triangle (default)',
        value: null
      },
      {
        icon: 'arrow-triangle-outline',
        label: 'Triangle Outline',
        value: 'triangle-outline'
      },
      {
        icon: 'arrow-triangle-halved',
        label: 'Triangle Halved',
        value: 'triangle-halved'
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
      }
    ]
  },
  {
    datasetKey: 'pathfindingMethod',
    label: 'Pathfinding Method',
    options: [
      {
        icon: 'pathfinding-method-bezier',
        label: 'Bezier (default)',
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
] as StylableAttribute[]