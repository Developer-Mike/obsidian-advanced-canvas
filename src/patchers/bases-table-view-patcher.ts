import { BasesPlugin, BasesTableCell, BasesTableCellContext, BasesTableRow, BasesTableView, BasesViewRegistrationEntry } from "src/@types/BasesPlugin"
import Patcher from "./patcher"

export default class BasesTableViewPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const bases: BasesPlugin = this.plugin.app.internalPlugins.getEnabledPluginById("bases")
    if (!bases) return // Core plugin not enabled

    this.patchViewFactory(bases)
  }

  private async patchViewFactory(bases: BasesPlugin) {
    const that = this

    await Patcher.patchOnce<BasesViewRegistrationEntry<BasesTableView>, BasesTableView>(this.plugin, bases.registrations.table, resolve => ({
      factory: Patcher.OverrideExisting(next => function (...args: any): BasesTableView {
        const view = next.call(this, ...args)

        that.patchTableView(view)
        resolve(view)

        return view
      })
    }))
  }

  private async patchTableView(basesView: BasesTableView) {
    const that = this

    await Patcher.patchOnce<BasesTableView, BasesTableRow>(this.plugin, basesView, resolve => ({
      updateVirtualDisplay: Patcher.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)

        if (this.rows.length > 0) {
          const row = this.rows.first()!

          that.patchTableRow(row)
          resolve(row)
        }

        return result
      })
    }))
  }

  private async patchTableRow(row: BasesTableRow) {
    const that = this

    await Patcher.patchOnce<BasesTableRow, BasesTableCell>(this.plugin, row, resolve => ({
      render: Patcher.OverrideExisting(next => function (...args: any): void {
        let result = next.call(this, ...args)

        if (this.cells.length > 0) {
          const cell = this.cells.first()!

          that.patchTableCell(cell)
          resolve(cell)

          // Re-render the first cell
          result = next.call(this, ...args)
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

        const result = next.call(this, ctx)

        if (isCanvas) ctx.file.extension = "canvas"
        return result
      })
    })
  }
}
