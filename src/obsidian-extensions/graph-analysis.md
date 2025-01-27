Graphview onloaded
this.registerEvent(this.app.metadataCache.on("resolved", this.update, this)),
this.dataEngine.load(),
this.update();
var e = this.app.internalPlugins.getPluginById("graph").instance;
this.dataEngine.setOptions(e.options)



---

app.workspace.activeLeaf.view.dataEngine.render -> Oc(fileCache)