Version: 1.12.2

# Bases cells
const controller = app.workspace.getActiveFileView().controller

## Rendering
controller.notifyView -> controller.view.onDataUpdated -> controller.view.display -> controller.view.updateVirtualDisplay -> new U4 (column).render -> U4.renderer.render -> "md" !== e.file.extension

Pos: 1:2365854

## Editing
controller.view.updateProperty -> app.fileManager.processFrontMatter
