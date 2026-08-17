import { BasesPlugin, BasesTableCell, BasesTableCellContext, BasesTableRow, BasesTableView, BasesViewRegistrationEntry } from "src/@types/BasesPlugin"
import Patcher, { invoke } from "./patcher"

export default class BasesTableViewPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const bases = this.plugin.app.internalPlugins.getEnabledPluginById("bases") as unknown as BasesPlugin | null
    if (!bases) return // Core plugin not enabled

    void this.patchViewFactory(bases)
  }

  private async patchViewFactory(bases: BasesPlugin) {
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    await Patcher.patchOnce<BasesViewRegistrationEntry<BasesTableView>, BasesTableView>(this.plugin, bases.registrations.table, resolve => ({
      factory: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): BasesTableView {
        const view = invoke(next, this, ...args)

        void that.patchTableView(view)
        resolve(view)

        return view
      })
    }))
  }

  private async patchTableView(basesView: BasesTableView) {
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    await Patcher.patchOnce<BasesTableView, BasesTableRow>(this.plugin, basesView, resolve => ({
      updateVirtualDisplay: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        const result = invoke(next, this, ...args)

        if (this.rows.length > 0) {
          const row = this.rows.first()!

          void that.patchTableRow(row)
          resolve(row)
        }

        return result
      })
    }))
  }

  private async patchTableRow(row: BasesTableRow) {
    const that = this // eslint-disable-line @typescript-eslint/no-this-alias -- For patcher

    await Patcher.patchOnce<BasesTableRow, BasesTableCell>(this.plugin, row, resolve => ({
      render: Patcher.OverrideExisting(next => function (...args: Parameters<typeof next>): void {
        let result = invoke(next, this, ...args)

        if (this.cells.length > 0) {
          const cell = this.cells.first()!

          void that.patchTableCell(cell)
          resolve(cell)

          result = invoke(next, this, ...args)
        }

        return result
      })
    }))
  }

  private async patchTableCell(cell: BasesTableCell) {
    Patcher.patchPrototype<BasesTableCell>(this.plugin, cell, {
      render: Patcher.OverrideExisting(next => function (ctx: BasesTableCellContext): void {
        const isCanvas = ctx.file?.extension === "canvas"
        if (isCanvas) ctx.file.extension = "md"

        const result = invoke(next, this, ctx)

        if (isCanvas) ctx.file.extension = "canvas"
        return result
      })
    })
  }
}
