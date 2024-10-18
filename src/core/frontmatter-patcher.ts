import { FrontMatterCache, TAbstractFile, TFile } from "obsidian"
import AdvancedCanvasPlugin from "src/main"
import PatchHelper from "src/utils/patch-helper"
import { FrontmatterEvent } from "./frontmatter-events"

export const CANVAS_FRONTMATTER_FILES_FOLDER = '-canvas-frontmatter'
export const CANVAS_FRONTMATTER_REF_PROPERTY = 'canvas-file'

export default class FrontmatterPatcher {
  plugin: AdvancedCanvasPlugin

  constructor(plugin: AdvancedCanvasPlugin) {
    this.plugin = plugin
    this.applyPatches()
  }

  private async applyPatches() {
    const that = this

    // Patch the file manager
    PatchHelper.patchObjectPrototype(this.plugin, this.plugin.app.fileManager, {
      getCanvasFrontmatterFile: (_next: any) => async function (canvas: TFile | null): Promise<TFile | null> {
        if (!canvas || !canvas.path.endsWith('.canvas')) return null

        const path = `${CANVAS_FRONTMATTER_FILES_FOLDER}/${canvas.path.replace(/\\/g, '/')}.md`
        const file = that.plugin.app.vault.getAbstractFileByPath(path) as TFile | null
        if (file) return file

        const canvasFrontmatterRef = `${CANVAS_FRONTMATTER_REF_PROPERTY}: "[[${canvas.path}]]"`
        return await that.plugin.app.vault.create(path, `---\n${canvasFrontmatterRef}\n---`)
      },
      processFrontMatter: (next: any) => async function (path: string, transaction: (frontmatter: FrontMatterCache) => void, ...args: any[]) {
        let frontmatterFilePath = path

        // Reroute frontmatter processing to the canvas frontmatter file
        const isCanvas = path.endsWith('.canvas')
        if (isCanvas) {
          const canvasFrontmatterFile = await this.getCanvasFrontmatterFile(that.plugin.app.vault.getAbstractFileByPath(path) as TFile)

          // Should always be true
          if (canvasFrontmatterFile) frontmatterFilePath = canvasFrontmatterFile.path
        }

        return await next.call(this, frontmatterFilePath, transaction, ...args)
      }
    })

    // Add on canvas frontmatter file changed event
    this.plugin.registerEvent(this.plugin.app.metadataCache.on(
      'changed',
      (file: TAbstractFile) => {
        if (!(file instanceof TFile) || !file.path.startsWith(CANVAS_FRONTMATTER_FILES_FOLDER)) return

        const fileCache = that.plugin.app.metadataCache.getFileCache(file)
        if (!fileCache) return

        // TODO: Restore canvas-file property if it was removed
        const canvasPath = fileCache.frontmatterLinks?.find(link => link.key === CANVAS_FRONTMATTER_REF_PROPERTY)?.link
        if (!canvasPath) return

        const frontmatter = fileCache.frontmatter ?? {}

        that.triggerCanvasFrontmatterChanged(canvasPath, frontmatter)
      }
    ))

    // TODO: Link creation of canvas files to creation of the respective frontmatter file
    // TODO: Link deletion of canvas files to deletion of the respective frontmatter file

    // TODO: Intercept opening of frontmatter files and redirect to canvas file
  }

  private triggerCanvasFrontmatterChanged(path: string, frontmatter: FrontMatterCache) {
    this.plugin.app.workspace.trigger(FrontmatterEvent.FrontmatterChanged, path, frontmatter)
  }
}