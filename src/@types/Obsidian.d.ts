export * from "obsidian"

declare module "obsidian" {
  export default interface App {
    /** @public */
    keymap: Keymap
    /** @public */
    scope: Scope
    /** @public */
    vault: Vault
    /** @public */
    metadataCache: MetadataCache
    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: UserEvent | null

    internalPlugins: any

    // Custom
    /** @public */
    workspace: Workspace & ExtendedWorkspace
    /** @public */
    fileManager: FileManager & ExtendedFileManager
  }

  export interface ExtendedFileManager {
    getCanvasFrontmatterFile(canvas: TFile | null, create?: boolean): Promise<TFile | null>
  }

  export interface ExtendedWorkspace {
    on(name: string, callback: (...args: any) => void): EventRef
  }

  export interface EventRef {
    fn: (...args: any) => any
  }
}