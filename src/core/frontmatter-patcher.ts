import { FrontMatterCache, TAbstractFile, TFile, TFolder } from "obsidian"
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
      getCanvasFrontmatterFile: (_next: any) => async function (canvas: TFile | null, create?: boolean): Promise<TFile | null> {
        if (!canvas || !canvas.path.endsWith('.canvas')) return null

        const frontmatterFilePath = that.getFrontmatterFilePath(canvas.path)
        const file = that.plugin.app.vault.getAbstractFileByPath(frontmatterFilePath) as TFile | null
        if (file) return file

        if (create) {
          await that.createParentFolders(frontmatterFilePath)

          const canvasFrontmatterRef = `${CANVAS_FRONTMATTER_REF_PROPERTY}: "[[${canvas.path}]]"`
          return await that.plugin.app.vault.create(frontmatterFilePath, `---\n${canvasFrontmatterRef}\n---`)
        } else {
          return new Promise((resolve) => {
            const createFileEventRef = that.plugin.app.vault.on('create', (file: TAbstractFile) => {
              if (file.path !== frontmatterFilePath) return

              that.plugin.app.vault.offref(createFileEventRef)
              resolve(file as TFile)
            })

            that.plugin.registerEvent(createFileEventRef)
          })
        }
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

    // Listen for canvas file creation event
    this.plugin.registerEvent(this.plugin.app.vault.on(
      'create',
      async (file: TAbstractFile) => {
        if (!this.plugin.app.workspace.layoutReady) return
        if (!(file instanceof TFile) || !file.path.endsWith('.canvas')) return
        
        // Create the frontmatter file (but ignore the result)
        await this.plugin.app.fileManager.getCanvasFrontmatterFile(file, true)
      }
    ))

    // Listen for renaming of canvas files
    this.plugin.registerEvent(this.plugin.app.vault.on(
      'rename',
      async (file: TAbstractFile, oldPath: string) => {
        if (!(file instanceof TFile) || !oldPath.endsWith('.canvas')) return

        const oldFrontmatterFilePath = this.getFrontmatterFilePath(oldPath)
        const oldFrontmatterFile = this.plugin.app.vault.getAbstractFileByPath(oldFrontmatterFilePath)
        if (!oldFrontmatterFile) return
        const oldFrontmatterFileParent = oldFrontmatterFile.parent

        const newFrontmatterFilePath = this.getFrontmatterFilePath(file.path)

        await this.createParentFolders(newFrontmatterFilePath)
        await this.plugin.app.vault.rename(oldFrontmatterFile, newFrontmatterFilePath)
        await this.cleanupEmptyFolders(oldFrontmatterFileParent)
      }
    ))

    // Listen for canvas frontmatter file changed event
    this.plugin.registerEvent(this.plugin.app.metadataCache.on(
      'changed',
      (file: TAbstractFile) => {
        if (!(file instanceof TFile) || !file.path.startsWith(CANVAS_FRONTMATTER_FILES_FOLDER)) return

        const fileCache = this.plugin.app.metadataCache.getFileCache(file)
        if (!fileCache) return

        const canvasPath = fileCache.frontmatterLinks?.find(link => link.key === CANVAS_FRONTMATTER_REF_PROPERTY)?.link
        if (!canvasPath) return

        const frontmatter = fileCache.frontmatter ?? {}

        this.triggerCanvasFrontmatterChanged(canvasPath, frontmatter)
      }
    ))

    // Listen for canvas file deletion event
    this.plugin.registerEvent(this.plugin.app.vault.on(
      'delete',
      async (file: TAbstractFile) => {
        if (!(file instanceof TFile) || !file.path.endsWith('.canvas')) return

        const frontmatterFile = this.plugin.app.vault.getAbstractFileByPath(this.getFrontmatterFilePath(file.path))
        if (!frontmatterFile) return

        const parent = frontmatterFile.parent
        await this.plugin.app.vault.delete(frontmatterFile)

        // Cleanup empty folders
        await this.cleanupEmptyFolders(parent)
      }
    ))

    // TODO: Intercept opening of frontmatter files and redirect to canvas file
  }

  private getFrontmatterFilePath(path: string) {
    return `${CANVAS_FRONTMATTER_FILES_FOLDER}/${path.replace(/\\/g, '/')}.md`
  }

  private async createParentFolders(path: string) {
    const folders = path.split('/').slice(0, -1)
    for (let i = 1; i <= folders.length; i++) {
      const folderPath = folders.slice(0, i).join('/')

      if (this.plugin.app.vault.getAbstractFileByPath(folderPath)) continue
      await this.plugin.app.vault.createFolder(folderPath)
    }
  }

  private async cleanupEmptyFolders(folder: TFolder | null) {
    while (folder instanceof TFolder && folder.children.length === 0) {
      const parent = folder.parent
      await this.plugin.app.vault.delete(folder, true)
      folder = parent
    }
  }

  private triggerCanvasFrontmatterChanged(path: string, frontmatter: FrontMatterCache) {
    this.plugin.app.workspace.trigger(FrontmatterEvent.FrontmatterChanged, path, frontmatter)
  }
}