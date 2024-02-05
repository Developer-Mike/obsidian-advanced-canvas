const PLUGIN_EVENT_PREFIX = 'advanced-canvas'

export enum CanvasEvent {
  CanvasChanged = `${PLUGIN_EVENT_PREFIX}:canvas-changed`,
  PopupMenuCreated = `${PLUGIN_EVENT_PREFIX}:popup-menu-created`,
  NodesChanged = `${PLUGIN_EVENT_PREFIX}:nodes-changed`,
  NodeInteraction = `${PLUGIN_EVENT_PREFIX}:node-interaction`
}