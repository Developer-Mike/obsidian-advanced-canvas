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
  multiselect: boolean
  options: StylableAttributeOption[]
}

export const DEFAULT_NODE_STYLE_SETTINGS = [
  {
    datasetKey: 'textAlign',
    label: 'Text Alignment',
    nodeTypes: ['text', 'file'],
    multiselect: false,
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
    datasetKey: 'shape',
    label: 'Shape',
    nodeTypes: ['text'],
    multiselect: false,
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
    multiselect: false,
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
] as StylableAttribute[]

export const DEFAULT_EDGE_STYLE_SETTINGS = [
  { // TODO
    datasetKey: 'style',
    label: 'Style',
    multiselect: false,
    options: [
      {
        icon: 'dotted-line',
        label: 'Dotted',
        value: 'dotted'
      },
      {
        icon: 'short-dashed-line',
        label: 'Short Dashed',
        value: 'short-dashed'
      },
      {
        icon: 'long-dashed-line',
        label: 'Long Dashed',
        value: 'long-dashed'
      }
    ]
  }
] as StylableAttribute[]