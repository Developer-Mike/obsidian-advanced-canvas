import { BasesTableCell, BasesTableRow, BasesTableRowContext, BasesTableView, BasesViewRegistrationEntry } from "src/@types/BasesPlugin"
import Patcher from "./patcher"

export default class BasesTableViewPatcher extends Patcher {
  protected async patch() {
    if (!this.plugin.settings.getSetting('canvasMetadataCompatibilityEnabled')) return

    const bases = this.plugin.app.internalPlugins.getEnabledPluginById("bases")
    if (!bases) return // Core plugin not enabled

    const that = this
    let uninstallers: (() => void)[] = []
    Patcher.patch<BasesViewRegistrationEntry<BasesTableView>>(this.plugin, bases.registrations.table, {
      factory: Patcher.OverrideExisting(next => function (...args: any): BasesTableView {
        const view = next.call(this, ...args)

        // Uninstall the patches
        for (const uninstall of uninstallers)
          uninstall()

        uninstallers = []
        Patcher.patch<BasesTableView>(that.plugin, view, {
          updateVirtualDisplay: Patcher.OverrideExisting(next => function (...args: any): void {
            const result = next.call(this, ...args)

            const row = this.rows[0]
            if (!row) return result

            // Uninstall the patches
            for (const uninstall of uninstallers)
              uninstall()

            uninstallers = []
            Patcher.patch<BasesTableRow>(that.plugin, row, {
              render: Patcher.OverrideExisting(next => function (...args: any): void {
                const result = next.call(this, ...args)

                const cell = this.cells[0]
                if (!cell) return result

                // Uninstall the patches
                for (const uninstall of uninstallers)
                  uninstall()

                that.patchCell(cell)

                // Refresh the view
                return next.call(this, ...args)
              })
            }, false, uninstallers)

            return result
          })
        }, false, uninstallers)

        return view
      })
    }, false, uninstallers)
  }

  private patchCell(cell: BasesTableCell) {
    Patcher.patchPrototype<BasesTableCell>(this.plugin, cell, {
      render: Patcher.OverrideExisting(next => function (ctx: BasesTableRowContext): void {
        const isCanvas = ctx.file?.extension === "canvas"
        if (isCanvas) ctx.file.extension = "md"

        const result = next.call(this, ctx)

        if (isCanvas) ctx.file.extension = "canvas"
        return result
      })
    })
  }
}
