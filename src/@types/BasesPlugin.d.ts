import { TFile } from "obsidian"

export interface BasesPlugin {
  registrations: Record<string, BasesViewRegistrationEntry<any>>
}

export interface BasesViewRegistrationEntry<T> {
  factory(...args: any): T
}

export interface BasesTableView {
  type: "table"
  rows: BasesTableRow[]

  updateVirtualDisplay(): void
}

export interface BasesTableRow {
  cells: BasesTableCell[]

  render(...args: any[]): void
}

export interface BasesTableCell {
  render(ctx: BasesTableCellContext): void
}

export interface BasesTableCellContext {
  file: TFile
}
