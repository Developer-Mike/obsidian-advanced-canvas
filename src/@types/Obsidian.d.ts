export * from "obsidian"

declare module "obsidian" {
  export default interface App {
    /** @public */
    keymap: Keymap;
    /** @public */
    scope: Scope;

    /** @public */
    vault: Vault;
    /** @public */
    metadataCache: MetadataCache;

    /** @public */
    fileManager: FileManager;

    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: UserEvent | null;

    /** @public */
    workspace:  Workspace & {
      on(name: string, callback: (...args: any) => void): EventRef
    }
  }

  export interface EventRef {
    fn: (...args: any) => any
  }
}