import { TFile } from "obsidian"

export interface BasesPlugin {
  registrations: Record<string, BasesViewRegistrationEntry<BasesTableView>>
}

export interface BasesViewRegistrationEntry<T> {
  factory(...args: unknown[]): T
}

export interface BasesTableView {
  type: "table"
  rows: BasesTableRow[]

  updateVirtualDisplay(): void
}

export interface BasesTableRow {
  cells: BasesTableCell[]

  render(...args: unknown[]): void
}

export interface BasesTableCell {
  render(ctx: BasesTableCellContext): void
}

export interface BasesTableCellContext {
  file: TFile
}
