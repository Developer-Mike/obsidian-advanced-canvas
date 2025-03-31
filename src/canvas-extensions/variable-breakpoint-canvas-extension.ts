import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export const VARIABLE_BREAKPOINT_CSS_VAR = '--variable-breakpoint'

export default class VariableBreakpointCanvasExtension extends CanvasExtension {
  isEnabled() { return 'variableBreakpointFeatureEnabled' as const }

  init() {
    /* this.plugin.registerEvent(this.plugin.app.workspace.on(
      'css-change',
      () => {}
    )) */ // Not supported because of performance
    
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-breakpoint-changed',
      (canvas: Canvas, node: CanvasNode, breakpointRef: { value: boolean }) => this.onNodeBreakpointChanged(canvas, node, breakpointRef)
    ))
  }

  private onNodeBreakpointChanged(canvas: Canvas, node: CanvasNode, breakpointRef: { value: boolean }) {
    if (!node.initialized) return // Not initialized

    if (node.breakpoint === undefined) {
      const computedStyle = window.getComputedStyle(node.nodeEl)
      const variableBreakpointString = computedStyle.getPropertyValue(VARIABLE_BREAKPOINT_CSS_VAR)

      let numberBreakpoint
      if (variableBreakpointString.length > 0 && !isNaN(numberBreakpoint = parseFloat(variableBreakpointString)))
        node.breakpoint = numberBreakpoint
      else node.breakpoint = null
    }

    if (node.breakpoint === null) return // No breakpoint
    breakpointRef.value = canvas.zoom > node.breakpoint
  }
}