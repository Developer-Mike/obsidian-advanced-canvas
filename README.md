<h3 align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/logo-dark.png">
        <img alt="Logo" src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/logo-light.png" width="100">
    </picture><br/><br/>
	Advanced Canvas for <a href="https://obsidian.md">Obsidian.md</a>
</h3>

<p align="center">
    <a href="https://github.com/Developer-Mike/obsidian-advanced-canvas/stargazers"><img src="https://img.shields.io/github/stars/Developer-Mike/obsidian-advanced-canvas?colorA=363a4f&colorB=e0ac00&style=for-the-badge" alt="GitHub star count"></a>
    <a href="https://github.com/Developer-Mike/obsidian-advanced-canvas/issues"><img src="https://img.shields.io/github/issues/Developer-Mike/obsidian-advanced-canvas?colorA=363a4f&colorB=e93147&style=for-the-badge" alt="Open issues on GitHub"></a>
    <br/>
	<a href="https://obsidian.md/plugins?id=advanced-canvas"><img src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&query=$.advanced-canvas.downloads&label=Downloads&style=for-the-badge&colorA=363a4f&colorB=d53984"/></a>
    <a href="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=GPL-3.0&colorA=363a4f&colorB=b7bdf8" alt="GPL-3.0 license"/></a>
    <br/><br/>
    <b>⚡ Supercharge</b> your canvas experience! Create presentations, flowcharts and more!
</p>

## ✨ Key Features

This plugin enhances the Obsidian Canvas with a wide range of features to boost your productivity and creativity. Here's a highlight of what Advanced Canvas offers:

*   **Enhanced Styling:** Customize the appearance of your canvas nodes and edges with shapes, border styles, arrow styles, path styles, and more.
*   **Metadata Integration:** Seamlessly integrate canvas files with Obsidian's metadata cache, enabling graph view connections, backlinks, and outgoing links for canvas elements.
*   **Presentation Mode:** Transform your canvases into interactive presentations with arrow-based navigation and presentation remote compatibility.
*   **Portals:** Embed canvases within canvases, creating nested and interconnected visual workspaces.
*   **Collapsible Groups:** Organize complex canvases by collapsing and expanding groups of nodes.
*   **Advanced Export:** Export your canvases as high-quality PNG or SVG images, with options for transparency and custom branding.
*   **Workflow Improvements:** Benefit from features like auto node resizing, focus mode, encapsulation, floating edges, and more to streamline your canvas workflows.

## 🚀 Installation

There are several ways to install Advanced Canvas:

**Easy Installation (Recommended):**

1.  Open Obsidian Settings > Community Plugins.
2.  Click "Browse" and search for "Advanced Canvas".
3.  Click "Install" and then "Enable".
    Alternatively, click [here](https://obsidian.md/plugins?id=advanced-canvas) to open the plugin page directly in Obsidian.

<details>
    <summary>Other Installation Methods</summary>
    <br/>
    <ul>
        <li><strong>Install with BRAT (Obsidian42 - BRAT):</strong>
            <ol>
                <li>Install and enable the <a href="https://github.com/TfTHacker/obsidian42-brat">BRAT</a> plugin.</li>
                <li>Open BRAT settings and add "Developer-Mike/obsidian-advanced-canvas" as a beta plugin.</li>
                <li>Enable Advanced Canvas in Community Plugins.</li>
            </ol>
        </li>
        <li><strong>Manual Installation:</strong>
            <ol>
                <li>Create a folder named <code>advanced-canvas</code> in your vault's plugins folder (<code><vault>/.obsidian/plugins/</code>).</li>
                <li>Download <code>main.js</code>, <code>styles.css</code>, and <code>manifest.json</code> from the <a href="https://github.com/Developer-Mike/obsidian-advanced-canvas/releases/latest">latest release</a> and place them in the <code>advanced-canvas</code> folder.</li>
                <li>Enable the plugin in Settings > Community plugins > Installed plugins.</li>
            </ol>
        </li>
    </ul>
</details>

## 💖 Support

If you find Advanced Canvas helpful, please consider supporting its development!

*   **Star the repository** ⭐ to show your appreciation.
*   **Donate on Ko-fi** ❤️: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/X8X27IA08)

Thank you for your support!

[![Time Spent](https://img.shields.io/endpoint?url=https://wakapi.by-mika.dev/api/compat/shields/v1/mika.dev/interval:any/project:obsidian-advanced-canvas&label=Time%20Spent&style=for-the-badge&colorA=ffffff&colorB=ff5e5b "Time Spent")](https://wakapi.by-mika.dev)

## 🛠️ Features in Detail

Advanced Canvas is packed with features, **all** of which can be toggled and customized in the plugin settings.

### 🔗 Metadata & Linking

*   **Full Metadata Cache Support:** Canvas files are fully integrated into Obsidian's metadata system.
    *   Canvas files are indexed in the graph view, backlinks, and outgoing links.
    *   Option to create outgoing links when embeds in a canvas are connected by edges.
    *   <details>
        <summary>Metadata Cache Support Examples</summary>
        <img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/metadata-cache-support.png" alt="Metadata Cache Support Example"/>
        <br>
        <img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/edge-metadata-cache.png" alt="Outgoing Link Using An Edge Example"/>
        <br>
        <details>
            <summary>Technical Details</summary>
            <ul>
                <li>File cache for .canvas files now includes a hash key.</li>
                <li>Metadata cache (`app.metadataCache`) fully supports .canvas files (getCache, getFileCache, etc.).</li>
                <li>Position object in metadata includes `nodeId` for canvas nodes.</li>
                <li>New `nodes` key in canvas metadata entry: `{ [nodeId: string]: MetadataCacheEntry }` for node-level metadata access.</li>
                <li>Resolved links object includes entries for .canvas files, mirroring markdown file behavior.</li>
            </ul>
        </details>
        </details>

### ✨ Styling Enhancements

#### Node Styles

Customize the visual appearance of your nodes to create clear and informative canvases.

*   **Node Shapes:**  Visually categorize nodes using flowchart shapes.
    *   Terminal, Process, Decision, Input/Output, On-page Reference, Predefined Process, Document, Database shapes available.
    *   Access shapes via the node's popup menu.
    *   <details>
            <summary>See Node Shape Examples</summary>
             <img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/sample-flowchart.png" alt="Flowchart Example"/>
             <br>
             <details><summary>Terminal Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/terminal.png" alt="Terminal Shape"/></details>
             <details><summary>Process/Center Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/process.png" alt="Process/Center Shape"/></details>
             <details><summary>Decision Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/decision.png" alt="Decision Shape"/></details>
             <details><summary>Input/Output Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/input-output.png" alt="Input/Output Shape"/></details>
             <details><summary>On-page Reference Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/reference.png" alt="On-page Reference Shape"/></details>
             <details><summary>Predefined Process Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/predefined-process.png" alt="Predefined Process Shape"/></details>
             <details><summary>Document Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/document.png" alt="Document Shape"/></details>
             <details><summary>Database Shape</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flowchart-nodes/database.png" alt="Database Shape"/></details>
        </details>

*   **Border Styles:** Choose from different border styles for visual distinction.
    *   Options: Dotted, Dashed, Invisible.
    *   <details><summary>See Border Style Examples</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/border-styles.png" alt="Border Styles Example"/></details>

*   **Text Alignment:** Control text alignment within nodes (Left, Center, Right).

#### Edge Styles

Customize the appearance of edges to enhance clarity and visual communication.

*   **Path Styles:** Modify the line style of edges.
    *   Options: Dotted, Short-dashed, Long-dashed.
    *   <details><summary>See Edge Path Style Examples</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/edge-path-styles.png" alt="Edge Path Styles Example"/></details>

*   **Arrow Styles:** Select from various arrow styles for different visual cues.
    *   Options: Triangle Outline, Halved Triangle, Thin Triangle, Diamond, Diamond Outline, Circle, Circle Outline, Blunt.
    *   <details><summary>See Arrow Style Examples</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/edge-arrow-styles.png" alt="Edge Arrow Styles Example"/></details>

*   **Pathfinding Methods:**  Choose how edges are routed between nodes.
    *   Options: Default, Straight, Square, A*.
    *   <details><summary>See Pathfinding Method Examples</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/edge-pathfinding-methods.png" alt="Edge Pathfinding Methods Example"/></details>

*   **Floating Edges (Automatic Edge Side):** Edges dynamically connect to the most suitable side of a node. Drag an edge to the indicated drop zone within a node to activate floating edges.
    *   <details><summary>See Floating Edges Example</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/floating-edge-example.png" alt="Floating Edges Example"/></details>

*   **Flip Edge:** Easily reverse the direction of an edge with a single click.
    *   <details><summary>See Flip Edge Example</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/flip-edge.gif" alt="Flip Edge Example"/></details>

#### Custom Styles

*   **Custom Style Attributes:** Add your own style attributes to nodes and edges for limitless customization using CSS snippets.
    *   Define custom attributes with labels, options, and icons directly in your CSS.
    *   <details>
        <summary>Custom Style Attribute Example & Usage</summary>

        **1. Create CSS Snippet:**  (e.g., `my-fancy-node-style.css`) in `Settings > Appearance > CSS snippets` folder.

        **2. Define Custom Style Attribute (YAML format in CSS comment):**
        ```css
        /* @advanced-canvas-node-style
        key: validation-state
        label: Validation State
        options:
          -
            label: Stateless
            value: null
            icon: circle-help
          -
            label: Approved
            value: approved
            icon: circle-check
          -
            label: Pending
            value: pending
            icon: circle-dot
          -
            label: Rejected
            value: rejected
            icon: circle-x
        */
        ```
        **3. Add CSS Styling:**
        ```css
        .canvas-node[data-validation-state="approved"] { /* ... */ }
        .canvas-node[data-validation-state="pending"] { /* ... */ }
        .canvas-node[data-validation-state="rejected"] { /* ... */ }
        ```
        **4. Enable CSS Snippet:** In Obsidian settings.

        <br><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/custom-style-attribute-example.png" alt="Custom Style Attribute Example"/>
        <br>**[See full example CSS file](https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/example-custom-node-style.css)**
        </details>

*   **Variable Breakpoints:** Control when node content unrenders based on zoom level, configurable via CSS.
    *   <details>
        <summary>Variable Breakpoint Example & Usage</summary>
        **CSS Snippet Example:**
        ```css
        .canvas-node[data-shape="pill"] {
            --variable-breakpoint: 0.5; /* Content unrenders at zoom level 0.5 */
        }
        ```
        </details>

*   **Custom Colors:** Extend the color picker with your own custom color palette.
    *   <details>
        <summary>Custom Color Example & Usage</summary>
        **CSS Snippet Example:**
        ```css
        body {
            --canvas-color-7: 0, 255, 0; /* RGB for the 7th color slot */
            --canvas-color-8: 255, 0, 255; /* RGB for the 8th color slot */
        }
        ```
        <img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/custom-colors.png" alt="Custom Colors In Palette"/>
        </details>

### 🗂️ Organization & Structure

*   **Collapsible Groups:**  Group nodes together and collapse/expand groups for better canvas organization and overview.
    *   <details><summary>Collapsible Groups Example</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/collapsible-groups.png" alt="Collapsible Groups Example"/></details>

*   **Z-Ordering Control:**  Manually adjust the stacking order of nodes using the context menu to bring specific nodes to the front or send them to the back.
    *   <details><summary>Z-Ordering Control Example</summary><img src="./assets/z-ordering-control.png" alt="Z-Ordering Control Example"/></details>

*   **Focus Mode:**  Highlight a single node by blurring all others, helping you concentrate on specific parts of your canvas.
    *   <details><summary>Focus Mode Example</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/focus-mode.png" alt="Focus Mode"/></details>

*   **Portals:** Embed entire canvases as nodes within other canvases, creating nested and linked visual systems. Double-click or use the "Open Portal" option to navigate into the embedded canvas.
    *   <details><summary>Portal Example & Usage</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/sample-portal-usage.png" alt="Portal example"/></details>

*   **Encapsulate Selection:**  Convert a selection of nodes into a new, separate canvas and automatically create a link to it from the original canvas, useful for breaking down complex canvases into smaller, manageable units.

### 📤 Export & Sharing

*   **Image Export:** Export the entire canvas or a selection as a PNG or SVG image with transparency. Includes Obsidian's "Privacy Mode" and extended "Show Logo" options.
    *   <details><summary>Image Export Example</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/image-export-example.svg" alt="Image Export Example"/></details>

### 🚀 Workflow Enhancements

*   **Presentation Mode:** Turn your canvases into presentations.
    *   Navigate slides (nodes) connected by arrows using arrow keys or presentation remotes.
    *   Supports numbered arrows for custom presentation flow.
    *   Readonly mode during presentations.
    *   Commands: "Start presentation", "Continue presentation", "Exit presentation".
    *   <details>
        <summary>Presentation Mode Examples & Usage</summary>
        <img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/sample-presentation-simple.gif" alt="Presentation mode example"/>
        <br>
        <details><summary>Simple Presentation Canvas File</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/sample-presentation-simple.png" alt="Presentation canvas file"/></details>
        <br><br>
        <img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/sample-presentation-complex.gif" alt="Complex presentation mode example"/>
        <br>
        <details><summary>Complex Presentation Canvas File</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/sample-presentation-complex.png" alt="Complex presentation canvas file"/></details>
        </details>

*   **Auto Node Resizing:** Nodes automatically resize to fit their text content. Toggle per-node.
    *   <details><summary>Auto Node Resizing Example</summary><img src="https://raw.githubusercontent.com/Developer-Mike/obsidian-advanced-canvas/main/assets/auto-node-resizing.gif" alt="Auto Node Resizing Example"/></details>

*   **Better Readonly Mode:** Enhanced readonly mode with options to:
    *   Disable node popup menus.
    *   Lock canvas position and zoom.
    *   Retains zoom-to-fit and zoom-to-selection functionality.
    *   Control menu in readonly mode to toggle features.

*   **Canvas Commands:** Extend canvas functionality with new commands accessible via the command palette.
    *   `Advanced Canvas: Open Quicksettings` - Opens the plugin's quick settings menu.
    *   `Advanced Canvas: Create text node` - Creates a new text node.
    *   `Advanced Canvas: Create file node` - Creates a new file node.
    *   `Advanced Canvas: Select all edges` - Selects all edges on the canvas.
    *   `Advanced Canvas: Zoom to selection` - Zooms to the bounding box of selected nodes.
    *   `Advanced Canvas: Zoom to fit` - Zooms to fit all nodes on the canvas.
    *   `Advanced Canvas: Clone node up/down/left/right` - Clones selected node in the arrow key direction.
    *   `Advanced Canvas: Expand node up/down/left/right` - Expands selected node in the arrow key direction.
    *   `Advanced Canvas: Flip selection horizontally/vertically` - Flips selected nodes and edges.

*   **Better Default Settings:** Customize default canvas behavior.
    *   Enforce grid alignment for new nodes.
    *   Customize default text and file node sizes.
    *   Modify minimum node size.
    *   Disable font scaling relative to zoom.

*   **Create Groups Independently:** Create groups without needing to pre-select nodes.

### ⚙️ Canvas Events

*   **Exposed Canvas Events:** Integrate with other plugins by utilizing custom canvas events.
    *   Events prefixed with `advanced-canvas:`.
    *   Listen to events using `app.workspace.on`.
    *   [See the list of events here](https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/src/events.ts).

## 🤝 Contributing

Contributions are welcome! If you're interested in contributing to Advanced Canvas:

*   Check for issues labeled "PRs appreciated" for starting points.
*   Feel free to work on any issue or suggest new features.
*   Pull requests that solely update documentation may not be merged; please open an issue for documentation suggestions instead.

## 📈 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Developer-Mike/obsidian-advanced-canvas&type=Date)](https://star-history.com/#Developer-Mike/obsidian-advanced-canvas&Date)