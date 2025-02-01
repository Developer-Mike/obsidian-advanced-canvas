# Backlinks Analysis
## Problem
recomputeBacklink(TFile) -> app.vault.getMarkdownFiles

### Solution
const recurseChildren = function(e, t) {
    for (var n = [e]; n.length > 0; ) {
        var i = n.pop();
        if (i && (t(i), i.children)) {
            var r = i.children;
            n = n.concat(r)
        }
    }
}
app.vault.getMarkdownFiles = function () {
    var markdownFiles = [];
    var root = this.getRoot();

    recurseChildren(root, function (child) {
        // Check if the child is an instance of `Sb` and has a ".md" extension
        if (child.extension === "md" || child.extension === "canvas") {
            markdownFiles.push(child); // Add it to the list of markdown files
        }
    });

    return markdownFiles; // Return the collected markdown files
}