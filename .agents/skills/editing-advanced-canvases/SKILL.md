---
name: editing-advanced-canvases
description: Reads, explains, creates, and safely edits Obsidian .canvas files using JSON Canvas and Advanced Canvas features. Use when inspecting or changing canvas nodes, edges, layouts, metadata, styles, presentations, portals, collapsible groups, or floating edges.
license: GPL-3.0
compatibility: Requires Python 3.10+ only when running the bundled validator.
metadata:
  author: LLM agent for Advanced Canvas
---

# Editing Advanced Canvases

Read and modify `.canvas` files as structured diagrams while preserving both standard JSON Canvas compatibility and Advanced Canvas behavior.

## Workflow

1. Read the entire target `.canvas` file before editing it. Also inspect linked files or portal canvases when their content affects the requested change.
2. Parse the file as JSON and inventory:
   - canvas-level `metadata`, especially `version`, `frontmatter`, and `startNode`
   - every node's ID, type, content, bounding box, and Advanced Canvas properties
   - every edge's direction, endpoints, label, and Advanced Canvas properties
   - the visual reading order implied by position, edge direction, and node array order
3. Explain the canvas semantically rather than dumping JSON. Describe sections, flows, relationships, presentation paths, portals, and any ambiguous or dangling references.
4. Plan the smallest structural edit. Reuse existing conventions for spacing, dimensions, colors, styles, ID shape, and JSON formatting.
5. Edit the JSON directly. Preserve unrelated and unknown fields; they may belong to Advanced Canvas, another plugin, or a future format version.
6. Optionally run `python3 <skill-directory>/scripts/validate_canvas.py path/to/file.canvas` for a partial structural check. Fix errors introduced by the edit; investigate pre-existing errors and warnings without normalizing unrelated data merely to silence the linter.
7. Re-read the changed objects and check the diff. Confirm the requested meaning, layout, edge direction, and presentation behavior—not just valid JSON.

Read [reference/format.md](reference/format.md) before creating Advanced Canvas fields or when a canvas uses metadata, styles, portals, presentations, collapsed groups, or floating edges.

## Editing Rules

- Keep existing node and edge IDs stable. References, embeds, portals, and `metadata.startNode` depend on them.
- Give each new node and edge a unique string ID. Prefer compact hexadecimal-like IDs without `-`; Advanced Canvas reserves structured IDs for portal elements.
- Keep `nodes` and `edges` arrays even when empty. Put nodes in back-to-front z-order; later nodes render above earlier nodes.
- Use integer coordinates and sizes for new nodes. Preserve existing numeric geometry, including fractional values produced by aspect-ratio resizing. Match the existing grid and spacing. Avoid overlaps unless layering is intentional.
- Keep edge direction intentional: `fromNode` is the source and `toNode` is the destination. Choose connection sides that fit relative node positions, even when an endpoint floats.
- Preserve unknown top-level, metadata, node, edge, and `styleAttributes` keys.
- Do not replace custom colors with preset colors. Presets `"1"` through `"6"` are theme-dependent; hex values are explicit.
- Use strict JSON for new files. Escape newlines inside text as `\n`; Markdown belongs in a text node's `text` string, not beside the JSON document.
- Do not add `metadata` only to reformat an otherwise standard canvas. When adding an Advanced Canvas feature, set `metadata.version` to `"1.0-1.0"` and preserve or initialize `metadata.frontmatter` as an object.
- Never save runtime-only fields such as `collapsedData`, `isPortalLoaded`, or portal-generated temporary nodes and edges.

## Common Changes

### Add a node

Choose the correct type and include the shared geometry fields. Then add exactly one type payload: `text`, `file`, `url`, or optional group display fields. Place it deliberately and add edges separately.

### Add or reconnect an edge

Verify both endpoint IDs. Set `fromSide` and `toSide`; add `fromFloating` or `toFloating` only when automatic side selection is desired. Labels affect presentation branch ordering, so preserve them unless the task changes navigation.

### Add Advanced Canvas behavior

- Styles belong in `styleAttributes`, not as arbitrary sibling keys.
- A presentation starts at the node named by `metadata.startNode` and follows outgoing edges.
- A portal is a `file` node targeting another `.canvas` file with `portal: true`; cross-canvas edges live in that portal node's `interdimensionalEdges`.
- A collapsed group uses `collapsed: true`. Do not synthesize or persist its runtime `collapsedData`.

## Final Checks

- JSON parses. If the optional partial validator is run, it reports no errors introduced by the edit.
- IDs are unique; normal edges resolve to existing nodes.
- Type-specific fields exist and paths/subpaths retain their exact spelling.
- Advanced values use supported spellings from the reference.
- Existing IDs, unknown fields, frontmatter, array order, and formatting changed only when required.
- The resulting diagram remains understandable spatially and through its directed edges.

<!-- This skill was created by an LLM agent. -->
