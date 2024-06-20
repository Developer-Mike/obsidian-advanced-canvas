import { CanvasNodeType } from "src/@types/Canvas"

export interface StylableAttributeOption {
  icon: string
  label: string
  cssclass: string | null // The element with the null value is the default
}

export interface StylableAttribute {
  label: string
  nodeTypes?: CanvasNodeType[]
  multiselect: boolean
  values: StylableAttributeOption[]
}

export const DEFAULT_NODE_STYLE_SETTINGS = [
  {
    label: 'Text Alignment',
    nodeTypes: ['text', 'file'],
    multiselect: false,
    values: [
      {
        icon: 'align-left',
        label: 'Left',
        cssclass: null
      },
      {
        icon: 'align-center',
        label: 'Center',
        cssclass: 'text-align-center'
      },
      {
        icon: 'align-right',
        label: 'Right',
        cssclass: 'text-align-right'
      }
    ]
  },
  {
    label: 'Shape',
    nodeTypes: ['text'],
    multiselect: false,
    values: [
      {
        icon: 'rectangle-horizontal',
        label: 'Round Rectangle (default)',
        cssclass: null
      },
      {
        icon: 'shape-pill',
        label: 'Pill',
        cssclass: 'shape-pill'
      },
      {
        icon: 'shape-diamond',
        label: 'Diamond',
        cssclass: 'diamond'
      },
      {
        icon: 'shape-parallelogram',
        label: 'Parallelogram',
        cssclass: 'shape-parallelogram'
      },
      {
        icon: 'shape-circle',
        label: 'Circle',
        cssclass: 'circle'
      },
      {
        icon: 'shape-predefined-process',
        label: 'Predefined Process',
        cssclass: 'shape-predefined-process'
      },
      {
        icon: 'shape-document',
        label: 'Document',
        cssclass: 'shape-document'
      },
      {
        icon: 'shape-database',
        label: 'Database',
        cssclass: 'shape-database'
      }
    ]
  },
  {
    label: 'Border',
    multiselect: false,
    values: [
      {
        icon: 'border-solid',
        label: 'Solid',
        cssclass: null
      },
      {
        icon: 'border-dashed',
        label: 'Dashed',
        cssclass: 'border-dashed'
      },
      {
        icon: 'border-dotted',
        label: 'Dotted',
        cssclass: 'border-dotted'
      },
      {
        icon: 'border-invisible',
        label: 'Invisible',
        cssclass: 'eye-off'
      }
    ]
  }
] as StylableAttribute[]

export const DEFAULT_EDGE_STYLE_SETTINGS = [
  { // TODO
    label: 'Style',
    multiselect: false,
    values: [
      {
        icon: 'dotted-line',
        label: 'Dotted',
        cssclass: 'dotted-line'
      },
      {
        icon: 'short-dashed-line',
        label: 'Short Dashed',
        cssclass: 'short-dashed-line'
      },
      {
        icon: 'long-dashed-line',
        label: 'Long Dashed',
        cssclass: 'long-dashed-line'
      }
    ]
  }
] as StylableAttribute[]