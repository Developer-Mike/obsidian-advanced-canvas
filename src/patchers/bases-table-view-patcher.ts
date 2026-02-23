import { BasesTableCell, BasesTableCellContext, BasesTableRow, BasesTableView, BasesViewRegistrationEntry } from "src/@types/BasesPlugin"
import Patcher from "./patcher"

export default class BasesTableViewPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const bases = this.plugin.app.internalPlugins.getEnabledPluginById("bases")
    if (!bases) return // Core plugin not enabled

    const basesView = await Patcher.waitFor<BasesViewRegistrationEntry<BasesTableView>, BasesTableView>(this.plugin, bases.registrations.table, resolve => ({
      factory: Patcher.OverrideExisting(next => function (...args: any): BasesTableView {
        const view = next.call(this, ...args)
        resolve(view)
        return view
      })
    }))

    const row = await Patcher.waitFor<BasesTableView, BasesTableRow>(this.plugin, basesView, resolve => ({
      updateVirtualDisplay: Patcher.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)

        if (this.rows.length > 0)
          resolve(this.rows.first()!)

        return result
      })
    }))

    const cell = await Patcher.waitFor<BasesTableRow, BasesTableCell>(this.plugin, row, resolve => ({
      render: Patcher.OverrideExisting(next => function (...args: any): void {
        const result = next.call(this, ...args)

        if (this.cells.length > 0)
          resolve(this.cells.first()!)

        return result
      })
    }))

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
