export * from "obsidian"

declare module "obsidian" {
  export interface App {
    embedRegistry: any
  }
}