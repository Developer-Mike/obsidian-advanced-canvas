# Graph Analysis
## Problem
dataEngine.render (app.workspace.getLeavesOfType('graph').first().view.dataEngine.render) -> internal function == "md"

### Solution (Unconfirmed)
app.workspace.getLeavesOfType('graph').first().view.dataEngine.render
  - patch: metadataCache.getCachedFiles -> return .md extensions instead of .canvas