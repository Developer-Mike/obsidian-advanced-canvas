const PLUGIN_EVENT_PREFIX = 'advanced-canvas'

export const CanvasEvent = {
  CanvasChanged: `${PLUGIN_EVENT_PREFIX}:canvas-changed`,
  ViewportChanged: {
    Before: `${PLUGIN_EVENT_PREFIX}:viewport-changed:before`,
    After: `${PLUGIN_EVENT_PREFIX}:viewport-changed:after`
  },
  PopupMenuCreated: `${PLUGIN_EVENT_PREFIX}:popup-menu-created`,
  NodesChanged: `${PLUGIN_EVENT_PREFIX}:nodes-changed`,
  NodeInteraction: `${PLUGIN_EVENT_PREFIX}:node-interaction`,
  ReadonlyChanged: `${PLUGIN_EVENT_PREFIX}:readonly-changed`
}