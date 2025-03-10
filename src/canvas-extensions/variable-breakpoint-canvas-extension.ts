import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasExtension from "./canvas-extension"

export const VARIABLE_BREAKPOINT_CSS_VAR = '--variable-breakpoint'

export default class VariableBreakpointCanvasExtension extends CanvasExtension {
  isEnabled() { return 'variableBreakpointFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-breakpoint-changed',
      (canvas: Canvas, node: CanvasNode, breakpointRef: { value: boolean }) => {
        const computedStyle = window.getComputedStyle(node.nodeEl)
        const variableBreakpointString = computedStyle.getPropertyValue(VARIABLE_BREAKPOINT_CSS_VAR)
        if (variableBreakpointString.length === 0) return

        const variableBreakpoint = parseFloat(variableBreakpointString)
        if (isNaN(variableBreakpoint)) return
        breakpointRef.value = canvas.zoom > variableBreakpoint
      }
    ))
  }
}