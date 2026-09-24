# Advanced JSON Canvas 1.0-1.0 Reference

This is a portable working reference distilled from Advanced Canvas's `assets/formats/advanced-json-canvas/spec/1.0-1.0.md`. The repository specification remains authoritative when this skill is used inside the Advanced Canvas repository.

## Document

```json
{
  "metadata": {
    "version": "1.0-1.0",
    "frontmatter": {},
    "startNode": "optional-node-id"
  },
  "nodes": [],
  "edges": []
}
```

`metadata` is optional for standard JSON Canvas files. Advanced Canvas metadata supports arbitrary canvas-wide fields. `frontmatter` values may be strings, numbers, booleans, or arrays. `startNode` identifies the first presentation slide.

## Nodes

Every node has:

```json
{
  "id": "a1b2c3d4",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 240
}
```

Shared optional fields:

- `dynamicHeight`: automatically size height from content
- `ratio`: maintained aspect ratio, calculated as `width / height`
- `zIndex`: persistent stacking level
- `color`: preset string `"1"`–`"6"`, custom preset string, or hex color such as `"#336699"`
- `styleAttributes`: extensible style object

Type payloads:

- `text`: required `text` string containing Markdown
- `file`: required vault-relative `file`; optional `subpath` beginning with `#`, `portal`, and `interdimensionalEdges`
- `link`: required `url`
- `group`: optional `label`, `background`, `backgroundStyle` (`cover`, `ratio`, or `repeat`), and `collapsed`

Nodes are ordered back-to-front in the array. Do not use `-` in newly generated IDs; the Advanced JSON Canvas specification reserves it for portal-related IDs, while the current plugin uses its own structured runtime IDs.

### Built-in node styles

```json
{
  "styleAttributes": {
    "textAlign": "center",
    "shape": "diamond",
    "border": "dashed"
  }
}
```

- `textAlign`: `left`, `center`, `right`
- `shape`: `rectangle`, `pill`, `diamond`, `parallelogram`, `circle`, `predefined-process`, `document`, `database`
- `border`: `solid`, `dashed`, `dotted`, `invisible`

Omitted built-in fields select defaults. Custom style attributes are allowed and must be preserved.

## Edges

```json
{
  "id": "e1f2a3b4",
  "fromNode": "a1b2c3d4",
  "fromSide": "right",
  "toNode": "b2c3d4e5",
  "toSide": "left"
}
```

- Advanced JSON Canvas requires sides: `top`, `right`, `bottom`, or `left`. Standard JSON Canvas permits either side to be omitted.
- Optional `fromFloating` / `toFloating`: let Advanced Canvas choose that endpoint's side
- Optional `fromEnd` / `toEnd`: `none` or `arrow`; defaults are no source arrow and a destination arrow
- Optional `color` and `label`
- Optional `styleAttributes`

Built-in edge styles:

- `path`: `solid`, `long-dashed`, `short-dashed`, `dotted`
- `arrow`: `triangle`, `triangle-outline`, `thin-triangle`, `halved-triangle`, `diamond`, `diamond-outline`, `circle`, `circle-outline`, `blunt`
- `pathfindingMethod`: `bezier`, `direct`, `square`, `a-star`

## Advanced behaviors

### Presentation

Set `metadata.startNode` to the first slide. Outgoing edges determine forward navigation; backward navigation retraces presentation history. If a node has multiple outgoing edges, labels establish branch order using lexical comparison, so zero-pad numeric labels such as `01`, `02`, and `10`.

### Portal

A portal is a file node whose `file` points to a `.canvas` file and whose `portal` is `true`. Store host-to-portal connections in that node's `interdimensionalEdges`. The current plugin qualifies a portal-side endpoint as `acportal||<portal-node-id>||<nested-node-id>`; preserve existing qualified IDs exactly. This runtime encoding is more specific than the format specification's general guidance to reserve hyphens for portal-related IDs. Do not copy the nested canvas's nodes into the host canvas.

### Collapsible group

Set `collapsed: true` on a group node. Contained nodes and edges remain in the persisted top-level arrays; hiding them is managed by the plugin at runtime. `collapsedData` is an intermediate value and must not be written.

### Floating edge

Keep required side fields and set `fromFloating` and/or `toFloating` to `true`. The plugin recalculates the effective side according to node positions.

<!-- This reference was created by an LLM agent. -->
