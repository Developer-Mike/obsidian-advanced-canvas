const PLUGIN_EVENT_PREFIX = 'advanced-canvas'

export const CanvasEvent = {
  CanvasChanged: `${PLUGIN_EVENT_PREFIX}:canvas-changed`,
  ViewportChanged: {
    Before: `${PLUGIN_EVENT_PREFIX}:viewport-changed:before`,
    After: `${PLUGIN_EVENT_PREFIX}:viewport-changed:after`
  },
  ZoomToBbox: {
    Before: `${PLUGIN_EVENT_PREFIX}:zoom-to-bbox:before`,
    After: `${PLUGIN_EVENT_PREFIX}:zoom-to-bbox:after`
  },
  PopupMenuCreated: `${PLUGIN_EVENT_PREFIX}:popup-menu-created`,
  NodesChanged: `${PLUGIN_EVENT_PREFIX}:nodes-changed`,
  NodeInteraction: `${PLUGIN_EVENT_PREFIX}:node-interaction`,
  ReadonlyChanged: `${PLUGIN_EVENT_PREFIX}:readonly-changed`,
  DataRequested: `${PLUGIN_EVENT_PREFIX}:data-requested`,
  LoadData: `${PLUGIN_EVENT_PREFIX}:load-data`,
  CanvasSaved: {
    Before: `${PLUGIN_EVENT_PREFIX}:canvas-saved:before`,
    After: `${PLUGIN_EVENT_PREFIX}:canvas-saved:after`
  }
}