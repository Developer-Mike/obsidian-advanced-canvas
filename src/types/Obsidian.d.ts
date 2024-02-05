export * from "obsidian"

declare module "obsidian" {
  type CustomWorkspace = Workspace & {
    on(name: string, callback: (...args: any) => void): EventRef
  }

  export default interface App {
    workspace: CustomWorkspace
  }
}