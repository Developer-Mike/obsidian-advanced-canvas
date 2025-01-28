```js
const targetNode = app.workspace.getActiveFileView("canvas").canvas.selection.values().next().value
targetNode.containerEl.replaceChildren()
const graph = this.app.internalPlugins.getEnabledPluginById("graph").plugin.views.graph({ app, containerEl: targetNode.containerEl })
targetNode.containerEl.querySelector(".view-header").remove()

const contentBlocker = document.createElement("div")
contentBlocker.classList.add("canvas-node-content-blocker")
targetNode.containerEl.appendChild(contentBlocker)

app.workspace.on("advanced-canvas:node-moved", (canvas, node) => {
  if (node.id === targetNode.id) graph.onResize()
})
```