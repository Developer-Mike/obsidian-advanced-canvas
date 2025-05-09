# An open, more advanced file format compatible with [JSON Canvas](https://github.com/obsidianmd/jsoncanvas) for infinite canvas data.

The Advanced JSON Canvas format is a structured way to represent a canvas with nodes and edges. It is designed to be extensible and flexible, allowing for various types of nodes and connections between them. It's completely compatible with the standard JSON Canvas format, but adds more features and flexibility.

Version name consists of two parts: the JSON Canvas version and the Advanced JSON Canvas version. It's in the following order: `<json-canvas-version>-<advanced-json-canvas-version>`. For example, `1.0-1.0` means JSON Canvas version 1.0 and Advanced JSON Canvas version 1.0.

Check out the [specification](spec/1.0-1.0.md) for more details on how to use this format.

## About the original **JSON Canvas** format
> Infinite canvas tools are a way to view and organize information spatially, like a digital whiteboard. Infinite canvases encourage freedom and exploration, and have become a popular interface pattern across many apps.
> 
> The JSON Canvas format was created to provide longevity, readability, interoperability, and extensibility to data created with infinite canvas apps. The format is designed to be easy to parse and give users [ownership over their data](https://stephango.com/file-over-app). JSON Canvas files use the `.canvas` extension. 
> 
> JSON Canvas was originally created for [Obsidian](https://obsidian.md/blog/json-canvas/). JSON Canvas can be implemented freely as an import, export, and storage format for any [app or tool](https://github.com/obsidianmd/jsoncanvas/blob/main/docs/apps.md).
