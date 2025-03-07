import { TFile } from "obsidian"

export default interface OutgoingLink {
  file: TFile

  recomputeLinks(): void
  recomputeUnlinked(): void
}