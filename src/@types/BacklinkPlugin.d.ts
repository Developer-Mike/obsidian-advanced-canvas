import { TFile } from "obsidian"

export default interface Backlink {
  recomputeBacklink(file: TFile | null): void
}