import { EventRef } from "obsidian"

export default interface BasesView {
  controller: BasesController

  onViewChanged(): void
}

export interface BasesController {
  events: BasesEvents
  view: BasesTableView

  selectView: (view: string) => void
  setQueryAndView: (query: any, view: string) => void
}

export interface BasesEvents {
  on(name: 'view-changed', callback: () => any, ctx?: any): EventRef
}

export interface BasesTableView {
  type: "table" | "list" | "cards" | string

  rows?: BasesTableRow[]
}

export interface BasesTableRow {
  render(): void
}
