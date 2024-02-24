const PLUGIN_EVENT_PREFIX = 'advanced-canvas'

export const CanvasEvent = {
  CanvasChanged: `${PLUGIN_EVENT_PREFIX}:canvas-changed`,
  ViewportChanged: {
    Before: `${PLUGIN_EVENT_PREFIX}:viewport-changed:before`,
    After: `${PLUGIN_EVENT_PREFIX}:viewport-changed:after`
  },
  NodeMoved: `${PLUGIN_EVENT_PREFIX}:node-moved`,
  DraggingStateChanged: `${PLUGIN_EVENT_PREFIX}:dragging-state-changed`,
  NodeAdded: `${PLUGIN_EVENT_PREFIX}:node-added`,
  EdgeAdded: `${PLUGIN_EVENT_PREFIX}:edge-added`,
  NodeRemoved: `${PLUGIN_EVENT_PREFIX}:node-removed`,
  EdgeRemoved: `${PLUGIN_EVENT_PREFIX}:edge-removed`,
  NodeChanged: `${PLUGIN_EVENT_PREFIX}:node-changed`,
  EdgeChanged: `${PLUGIN_EVENT_PREFIX}:edge-changed`,
  SelectionChanged: `${PLUGIN_EVENT_PREFIX}:selection-changed`,
  ZoomToBbox: {
    Before: `${PLUGIN_EVENT_PREFIX}:zoom-to-bbox:before`,
    After: `${PLUGIN_EVENT_PREFIX}:zoom-to-bbox:after`
  },
  PopupMenuCreated: `${PLUGIN_EVENT_PREFIX}:popup-menu-created`,
  NodeInteraction: `${PLUGIN_EVENT_PREFIX}:node-interaction`,
  Undo: `${PLUGIN_EVENT_PREFIX}:undo`,
  Redo: `${PLUGIN_EVENT_PREFIX}:redo`,
  ReadonlyChanged: `${PLUGIN_EVENT_PREFIX}:readonly-changed`,
  DataRequested: `${PLUGIN_EVENT_PREFIX}:data-requested`,
  LoadData: `${PLUGIN_EVENT_PREFIX}:load-data`,
  CanvasSaved: {
    Before: `${PLUGIN_EVENT_PREFIX}:canvas-saved:before`,
    After: `${PLUGIN_EVENT_PREFIX}:canvas-saved:after`
  }
}