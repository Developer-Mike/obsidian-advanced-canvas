<h3 align="center">
	<img src="./assets/logo.svg" width="100" alt="Logo"/><br/><br/>
	Advanced Canvas for <a href="https://obsidian.md">Obsidian.md</a>
</h3>

<p align="center">
    <a href="https://github.com/Developer-Mike/obsidian-advanced-canvas/stargazers"><img src="https://img.shields.io/github/stars/Developer-Mike/obsidian-advanced-canvas?colorA=363a4f&colorB=e0ac00&style=for-the-badge" alt="GitHub star count"></a>
    <a href="https://github.com/Developer-Mike/obsidian-advanced-canvas/issues"><img src="https://img.shields.io/github/issues/Developer-Mike/obsidian-advanced-canvas?colorA=363a4f&colorB=e93147&style=for-the-badge" alt="Open issues on GitHub"></a>
    <a href="https://github.com/Developer-Mike/obsidian-advanced-canvas/contributors"><img src="https://img.shields.io/github/contributors/Developer-Mike/obsidian-advanced-canvas?colorA=363a4f&colorB=08b94e&style=for-the-badge" alt="List of contributors"></a>
    <br/>
    <a href="https://github.com/catppuccin/catppuccin/blob/main/LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=GPL-3.0&colorA=363a4f&colorB=b7bdf8" alt="GPL-3.0 license"/></a>
    <br/><br/>
    <b>⚡ Supercharge</b> your canvas experience! Create presentations, flowcharts and more!
</p>

## Installation (waiting for approval for the community plugins list)
- Create a folder named `advanced-canvas` in your vault's plugins folder (`<vault>/.obsidian/plugins/`).
- Download `main.js`, `styles.css` and `manifest.json` from the latest release and put them in the `advanced-canvas` folder.
- Enable the plugin in Settings -> Community plugins -> Installed plugins

## Features
- Create groups independently of the nodes ([Updated card menu](#updated-canvas-card-menu))
- [Flowchart](#flowchart) shapes
  - Process shape
  - Terminal shape
  - Decision shape
  - Input/Output shape
  - On-page Reference shape
  - Predefined Process shape
  - Document shape
  - Database shape
- [Presentation mode](#presentation)
  - Create presentations by connecting nodes with arrows

## Updated Canvas Card Menu
<img src="./assets/card-menu.png" alt="New canvas menu"/>

## Flowchart
<details>
    <summary>Flowchart Example</summary>
    <img src="./assets/sample-flowchart.png" alt="Flowchart Example"/>
</details>

### Usage
- Use the [updated card menu](#updated-canvas-card-menu) to create flowchart nodes
- OR alter the node type by adding a comment at the beginning or end of the node (e.g. `%%process%%`)
  - Look up the aliases in the [code file](./src/canvas-extensions/flowchart-canvas-extension.ts)

### Shapes
<details>
    <summary>Process Shape</summary>
    <img src="./assets/flowchart-nodes/process.png" alt="Process Shape"/>
</details>

<details>
    <summary>Terminal Shape</summary>
    <img src="./assets/flowchart-nodes/terminal.png" alt="Terminal Shape"/>
</details>

<details>
    <summary>Decision Shape</summary>
    <img src="./assets/flowchart-nodes/decision.png" alt="Decision Shape"/>
</details>

<details>
    <summary>Input/Output Shape</summary>
    <img src="./assets/flowchart-nodes/input-output.png" alt="Input/Output Shape"/>
</details>

<details>
    <summary>On-page Reference Shape</summary>
    <img src="./assets/flowchart-nodes/reference.png" alt="On-page Reference Shape"/>
</details>

<details>
    <summary>Predefined Process Shape</summary>
    <img src="./assets/flowchart-nodes/predefined-process.png" alt="Predefined Process Shape"/>
</details>

<details>
    <summary>Document Shape</summary>
    <img src="./assets/flowchart-nodes/document.png" alt="Document Shape"/>
</details>

<details>
    <summary>Database Shape</summary>
    <img src="./assets/flowchart-nodes/database.png" alt="Database Shape"/>
</details>

## Presentation Mode
<img src="./assets/presentation-mode.gif" alt="Presentation mode example"/>

<details>
    <summary>Canvas File</summary>
    <img src="./assets/sample-presentation.png" alt="Presentation canvas file"/>
</details>

### More Complex Example
<img src="./assets/sample-presentation-complex.gif" alt="Complex presentation mode example"/>

<details>
    <summary>Canvas File</summary>
    <img src="./assets/sample-presentation-complex.png" alt="Complex presentation canvas file"/>
</details>

### Usage
- Create the first slide
  - Create the first slide of the presentation using the [updated card menu](#updated-canvas-card-menu)
  - OR create a group and name it `Start` (case sensitive)
- Add more slides
  - Link the slides using arrows
    - If you want to loop back to a previous slide, you can number the arrows in the order you want to navigate through them
  - <b>TIP:</b> Create slides with consistent dimensions by using the [updated card menu](#updated-canvas-card-menu)
- Control the presentation
  - Start the presentation using the command palette (`Advanced Canvas: Start presentation`)
  - Change slides using the arrow keys
  - Exit the presentation using the `ESC` key

## Settings
<img src="./assets/settings.png" alt="Settings Screen"/>

## Planned Features
- [ ] New presentation slides should be created without intersecting the existing ones
- [ ] Fix the document flowchart node (looks sketchy right now)
- [ ] Clean up flowchart node icons and css
- [x] Add better presentation mode navigation (Looping back to previous slides)
- [x] Add more flowchart shapes

## Known Issues
- None so far 👀 - Create an issue if you find any!