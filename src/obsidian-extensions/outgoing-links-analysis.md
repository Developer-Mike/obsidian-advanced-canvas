app.viewRegistry.viewByType["outgoing-link"]

openForCurrentFile(TFile)

recomputeLinks -> this.file.extension == "md"
app.workspace.activeLeaf.view.outgoingLink.recomputeLinks()

recomputeUnlinked -> this.file.extension == "md"

# Solution
// ("md" === r.extension || r.extension === "canvas")
app.workspace.activeLeaf.view.outgoingLink.file.extension = "md"