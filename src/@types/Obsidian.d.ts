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
    fileManager: FileManager
    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: UserEvent | null

    // Custom
    /** @public */
    metadataCache: ExtendedMetadataCache
    /** @public */
    workspace: Workspace & ExtendedWorkspace
  }

  export interface ExtendedMetadataCache extends MetadataCache {
    resolveLinks: (filepath: string) => void
  }

  export interface ExtendedWorkspace {
    on(name: string, callback: (...args: any) => void): EventRef
  }

  export interface EventRef {
    fn: (...args: any) => any
  }
}