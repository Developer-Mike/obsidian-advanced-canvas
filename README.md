# Advanced Canvas
An [Obsidian](https://obsidian.md/) plugin that supercharges your canvas experience. Create presentations, flowcharts and more!

## Installation
- Create a folder named `advanced-canvas` in your vault's plugins folder (`<vault>/.obsidian/plugins/`).
- Download `main.js`, `styles.css` and `manifest.json` from the latest release and put them in the `advanced-canvas` folder.
- Enable the plugin in Settings -> Community plugins -> Installed plugins

## Features
- Create groups independently of the nodes
- Flowchart shapes
  - Start/End shape
  - Process shape
  - Decision shape
  - Input/Output shape
- Create a presentation using the canvas
  - Create slides using groups
  - Navigate through the canvas using the arrow keys
  - Press `Esc` to exit the presentation mode

### Flowchart
![Sample Flowchart](/assets/sample-flowchart.png)

### Presentation
![Sample Presentation](/assets/sample-presentation.png)
![Presentation Mode](/assets/presentation-mode.gif)

#### Complex example
![Complex Presentation](/assets/sample-presentation-complex.png)
![Complex Presentation GIF](/assets/sample-presentation-complex.gif)

### Updated menu
![Menu](/assets/card-menu.png)

### Settings
![Settings](/assets/settings.png)

## Usage
- All the features are available in the context menu of the canvas
- The first slide of the presentation needs to be named `Start` (case sensitive)
- If you want to loop back to a previous slide, you can number the arrows in the order you want to navigate through them

## Planned features
- [ ] New presentation slides should be created without intersecting the existing ones
- [x] Add better presentation mode navigation (Looping back to previous slides)
- [ ] Add more flowchart shapes

## Known issues
- None so far 👀 - Create an issue if you find any!