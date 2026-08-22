# Advanced Canvas — Claude Instructions

Read the root `C:\Users\Clinton\p\AGENTS.md` first — it covers the Obsidian CLI, canvas internals,
and the build/install conventions. This file only holds plugin-specific knowledge.

## Attribution rule (from AGENTS.md)

`AGENTS.md` in this repo requires every LLM-authored change to be clearly marked — this fork uses
`// Added by an LLM agent` line comments. Follow that convention for any new change, including new
settings entries and extensions.

## Architecture

- `src/main.ts` — lifecycle only. Instantiates every class in the `CANVAS_EXTENSIONS` array and
  the patchers. New features = a new file in `src/canvas-extensions/` added to that array.
- `src/canvas-extensions/canvas-extension.ts` — base class: `isEnabled()` returns `true` or a
  settings key (feature is constructed only when the setting is on); `init()` does the wiring.
  Extensions communicate through custom workspace events (`advanced-canvas:*`, e.g.
  `node-created`, `node-moved`, `canvas-changed`, `settings-changed`) rather than patching
  Obsidian themselves.
- `src/patchers/canvas-patcher.ts` — the single place that monkey-patches Obsidian's Canvas /
  CanvasView / CanvasNode / CanvasEdge prototypes (via `monkey-around`) and emits those
  `advanced-canvas:*` events. If a feature needs a hook that doesn't exist yet, add the patch here
  and trigger a new event. For accessors (getters like `gridSpacing`) `around()` does NOT work —
  use `Object.getOwnPropertyDescriptor` / `Object.defineProperty` on `constructor.prototype` and
  register an uninstaller that restores the original descriptor (see `patchGridSpacing`).
- `src/settings.ts` — declarative: `AdvancedCanvasPluginSettingsValues` interface +
  `DEFAULT_SETTINGS_VALUES` + the `SETTINGS` tree that auto-generates the settings tab. A new
  setting needs an entry in all three. Feature headings get a toggle that "requires reload";
  settings read live (like `gridSize`) take effect immediately because the patched getter reads
  `settings.getSetting(...)` on every call.
- `src/@types/Canvas.d.ts` — hand-maintained typings of Obsidian's private canvas API. Extend it
  when you touch a new internal.
- `src/utils/canvas-helper.ts` — shared helpers. `CanvasHelper.GRID_SIZE = 20` is still the
  hardcoded default for edge-pathfinding margins; position/size snapping code should read the
  `gridSize` setting instead (see `better-default-settings-canvas-extension.ts` and
  `auto-resize-node-canvas-extension.ts`).

## Grid size feature (added by an LLM agent)

Obsidian's snap grid is a zoom-dependent `gridSpacing` getter on the Canvas prototype
(tiers 20/40/80/160). `patchGridSpacing` in `canvas-patcher.ts` overrides it to return multiples
of the `gridSize` setting (General section, default 20). This one accessor controls drag/resize
snapping, arrow-key nudging, arrange spacing, and the background grid pattern.

## "Default X" style settings pattern (added by an LLM agent)

The pattern behind `defaultGroupLabelSize` / `defaultGroupOpacity` / `defaultEdgeWidth` /
`defaultArrowSize` / `defaultNodeBorder` — use it for any new "default value of a per-element
style" setting:

1. Dropdown setting in the General section of `settings.ts` with an explicit "leave Obsidian
   alone" option (`'1'` for size multipliers, `'default'` otherwise).
2. Add it to `DEFAULT_SIZE_SETTINGS` in `default-style-sizes-canvas-extension.ts` (with
   `unchangedValue` if it isn't `'1'`). The extension exposes it as a `data-*` attribute on the
   canvas wrapper, and only while it differs from the unchanged value — the CSS is keyed on the
   attribute's *presence*, so Obsidian stays untouched by default.
3. Add the rules in `src/styles/default-style-sizes.scss`. An element's own explicit value must
   win: sizes do it with a `var(--x-multiplier, var(--default-x-multiplier, 1))` fallback, the
   node border does it with `:not([data-border])` (per-node style attributes are exposed as
   `data-*` on `node.nodeEl` by `dataset-exposers/node-exposer.ts` — but only while
   `nodeStylingFeatureEnabled` is on, so never rely on those attributes existing for behavior
   that must also work with node styling disabled).

## Canvas filter & portals/groups (added by an LLM agent)

`canvas-filter-canvas-extension.ts` never builds its graph from `canvas.getData()` — the portals
extension strips all portal elements from `getData()` output (`onGetData`, hooked via
`advanced-canvas:data-requested`), so any filter built on it is portal-blind. The filters instead
read the live `canvas.nodes` / `canvas.edges` maps (per-element `getData()` is not hooked). Live
portal elements look like ordinary nodes/edges with `acportal||`-prefixed ids;
`PortalsCanvasExtension.getNestedIds(id)` splits those ids, `isPortalElement(id)` detects them.

- Connection filters (`filterByConnections`, BFS from the selection): reaching an open portal
  node (a `file` node with `portal: true`) reveals its entire nested content; reaching a group
  node reveals every bbox-contained node (`bboxContains`, so nested groups are covered too). Both
  expansions run inside the BFS loop and traversal continues from the revealed nodes. After
  traversal, **every** edge with both endpoints visible is shown, not just the edges the
  traversal followed (A→B, A→C, B→C + filter from A shows B→C as well).
- `filter-immediately-connected-nodes` is the one-hop variant: `ConnectionFilter.immediate` in
  `CONNECTION_FILTERS` breaks after the first BFS iteration (portal/group expansion of first-hop
  nodes still runs).
- The color filter is portal-aware the same way: matching portal nodes expand to their full
  content; portal-internal nodes are excluded from direct color matching.
- Shared helpers on the extension class: `getPortalNestedNodes(nodes, portalId)` /
  `getPortalInternalEdges(edges, portalId)`.
- `filterByTag` still reads `canvas.getData().nodes` for its candidates (portal-blind) — not yet
  aligned with the others.

## Hidden ".md" files in the canvas file search (added by an LLM agent)

Files named exactly `.md` are dotfiles — Obsidian's vault layer never indexes them
(`vault.getFiles()` / `getAbstractFileByPath('.md')` return nothing), but
`vault.adapter.list()` still sees them. `src/patchers/dot-md-file-search-patcher.ts`
patches `Modal.prototype.open`, duck-types the canvas "Add note from vault" suggest
modal (the only suggest modal carrying a `.canvas` with `shouldShowMarkdown === true`),
and wraps the instance's `getSuggestions` / `renderSuggestion` / `onChooseSuggestion`
to inject `.md` files discovered by an adapter walk (skipping dot-folders). Injected
items are marked with `acDotMdPath` and carry a fake TFile duck-type
(`path/name/basename/extension/stat/getShortName`) because no real TFile exists.
Gated by the `dotMdFileSearchEnabled` feature heading (default on, requires reload).

## Build & install

- `npm run build` — esbuild (bundle + sass) straight into `dist/`; `manifest.json` is copied by
  `esbuild-plugin-copy`. **The build does not type-check** — run `npx tsc -noEmit -skipLibCheck`
  separately.
- `npm run dev` — watch mode, same output.
- `dist/` is a junction **into** the main vault
  (`dist -> C:\Users\Clinton\o\g\main\.obsidian\plugins\advanced-canvas`), i.e. the reversed-link
  style from the root CLAUDE.md — rebuilds are live in the vault with no copy step. Don't
  "normalize" the link direction. The **Company Documentation** vault also points its plugin
  folder at the same `dist/` (normal direction:
  `.obsidian\plugins\advanced-canvas -> C:\Users\Clinton\p\obsidian-advanced-canvas\dist`), so
  rebuilds are live there too — reload whichever vault you're testing
  (`obsidian vault='Company Documentation' reload`).
- After rebuilding, `obsidian plugin:reload` does NOT pick up junctioned code — use a full
  `obsidian vault=main reload`.

## Live testing

CLI calls here take ~60s each; run them in the background and batch probes into one eval.
Plugin object: `app.plugins.plugins['advanced-canvas']` (has `.settings.getSetting(key)` /
`.setSetting({...})`, which fires `advanced-canvas:settings-changed` — settings that are read
live apply immediately, no reload needed). Find a canvas with
`app.workspace.iterateAllLeaves(l => ... l.view.canvas ...)`, but expect several canvas leaves —
identify yours by a known node id, not by position. Open a canvas file with
`await app.workspace.openLinkText(path, '', 'tab')` — `setViewState` can leave an `empty` view.
If the Obsidian window is hidden, nodes don't render (empty `nodeEl`s, no computed styles) —
verify CSS targeting headlessly with `nodeEl.matches('<full selector>')` plus a
`document.styleSheets` rule search instead.
