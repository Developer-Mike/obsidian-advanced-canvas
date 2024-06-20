import { addIcon } from "obsidian"

const CUSTOM_ICONS = {
  'shape-pill': `<rect rx="31.25" height="62.5" width="93.75" y="18.75" x="3.125" stroke-width="8.333" stroke="currentColor" fill="transparent"/>`,
  'shape-parallelogram': `<rect transform="skewX(-20)" rx="5" height="50" width="70" y="25" x="35" stroke-width="8.333" stroke="currentColor" fill="transparent"/>`,
  'shape-predefined-process': `
    <g stroke-width="2" stroke="currentColor" fill="none" transform="matrix(4.166667,0,0,4.166667,0,0)">
      <path d="M 4.999687 3 L 19.000312 3 C 20.104688 3 21 3.895312 21 4.999687 L 21 19.000312 C 21 20.104688 20.104688 21 19.000312 21 L 4.999687 21 C 3.895312 21 3 20.104688 3 19.000312 L 3 4.999687 C 3 3.895312 3.895312 3 4.999687 3 Z M 4.999687 3 "/>
      <path d="M 7 3 L 7 21 "/>
      <path d="M 17 3 L 17 21 "/>
    </g>
  `,
  'shape-document': `<path transform="translate(0, 5)" stroke="currentColor" fill="none" stroke-width="8.333" d="M83.75 25C85.82 25 87.5 26.68 87.5 28.75L87.5 64.375Q68.75 54.25 50 64.375 31.25 74.5 12.5 64.375L12.5 30.625 12.5 28.75C12.5 26.68 14.18 25 16.25 25Z"/>`,
  'shape-database': `
    <g transform="translate(20, 20)" stroke-width="8.333" stroke="currentColor" fill="none">
      <path d="M 1 51 L 1 11 C 1 5.48 14.43 1 31 1 C 47.57 1 61 5.48 61 11 L 61 51 C 61 56.52 47.57 61 31 61 C 14.43 61 1 56.52 1 51 Z"/>
      <path d="M 1 11 C 1 16.52 14.43 21 31 21 C 47.57 21 61 16.52 61 11"/>
    </g>
  `,
  
  'border-solid': `<path stroke="currentColor" fill="none" stroke-width="8.333" d="M91.6667 45.8333v4.1667c0 2.0833-2.0833 4.1667-4.1667 4.1667H12.5c-2.0833 0-4.1667-2.0833-4.1667-4.1667v-4.1667"/>`,
  'border-dashed': `<path stroke="currentColor" fill="none" stroke-width="8.333" stroke-dasharray="13.7" d="M91.6667 45.8333v4.1667c0 2.0833-2.0833 4.1667-4.1667 4.1667H12.5c-2.0833 0-4.1667-2.0833-4.1667-4.1667v-4.1667"/>`,
  'border-dotted': `<path stroke="currentColor" fill="none" stroke-width="8.333" stroke-dasharray="8.7" d="M91.6667 45.8333v4.1667c0 2.0833-2.0833 4.1667-4.1667 4.1667H12.5c-2.0833 0-4.1667-2.0833-4.1667-4.1667v-4.1667"/>`,

  // TODO
  'dotted-line': `<path stroke="currentColor" fill="none" stroke-width="8.5" stroke-dasharray="8.5" d="M20.85 50h58.5"/>`,
  'short-dashed-line': `<path stroke="currentColor" fill="none" stroke-width="8.5" stroke-dasharray="10" d="M20.85 50h58.5"/>`,
  'long-dashed-line': `<path stroke="currentColor" fill="none" stroke-width="8.5" stroke-dasharray="20" d="M20.85 50h58.5"/>`
}

export default class IconsHelper {
  static addIcons() {
    for (const [id, svg] of Object.entries(CUSTOM_ICONS)) {
      addIcon(id, svg)
    }
  }
}