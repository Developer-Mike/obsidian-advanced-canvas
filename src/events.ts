const CANVAS_EVENT_PREFIX = 'canvas'
const PLUGIN_EVENT_PREFIX = 'advanced-canvas'

export const PluginEvent = {
  SettingsChanged: `${PLUGIN_EVENT_PREFIX}:settings-changed`
}

export const CanvasEvent = {
  // Built-in events
  SelectionContextMenu: `${CANVAS_EVENT_PREFIX}:selection-menu`,
  NodeContextMenu: `${CANVAS_EVENT_PREFIX}:node-menu`,
  EdgeContextMenu: `${CANVAS_EVENT_PREFIX}:edge-menu`,
  NodeConnectionDropContextMenu: `${CANVAS_EVENT_PREFIX}:node-connection-drop-menu`,

  // Custom events
  CanvasChanged: `${PLUGIN_EVENT_PREFIX}:canvas-changed`,
  ViewportChanged: {
    Before: `${PLUGIN_EVENT_PREFIX}:viewport-changed:before`,
    After: `${PLUGIN_EVENT_PREFIX}:viewport-changed:after`
  },
  NodeMoved: `${PLUGIN_EVENT_PREFIX}:node-moved`,
  NodeResized: `${PLUGIN_EVENT_PREFIX}:node-resized`,
  DoubleClick: `${PLUGIN_EVENT_PREFIX}:double-click`,
  DraggingStateChanged: `${PLUGIN_EVENT_PREFIX}:dragging-state-changed`,
  NodeCreated: `${PLUGIN_EVENT_PREFIX}:node-created`,
  EdgeCreated: `${PLUGIN_EVENT_PREFIX}:edge-created`,
  NodeAdded: `${PLUGIN_EVENT_PREFIX}:node-added`,
  EdgeAdded: `${PLUGIN_EVENT_PREFIX}:edge-added`,
  NodeChanged: `${PLUGIN_EVENT_PREFIX}:node-changed`,
  EdgeChanged: `${PLUGIN_EVENT_PREFIX}:edge-changed`,
  NodeTextContentChanged: `${PLUGIN_EVENT_PREFIX}:node-text-content-changed`,
  NodeRemoved: `${PLUGIN_EVENT_PREFIX}:node-removed`,
  EdgeRemoved: `${PLUGIN_EVENT_PREFIX}:edge-removed`,
  OnCopy: `${PLUGIN_EVENT_PREFIX}:copy`,
  NodeEditingStateChanged: `${PLUGIN_EVENT_PREFIX}:node-editing-state-changed`,
  NodeBreakpointChanged: `${PLUGIN_EVENT_PREFIX}:node-breakpoint-changed`,
  NodeBBoxRequested: `${PLUGIN_EVENT_PREFIX}:node-bbox-requested`,
  EdgeCenterRequested: `${PLUGIN_EVENT_PREFIX}:edge-center-requested`,
  ContainingNodesRequested: `${PLUGIN_EVENT_PREFIX}:containing-nodes-requested`,
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