import { Canvas } from "src/@types/Canvas"
import PatchHelper from "./patch-helper"

PatchHelper.patchPrototype<Canvas>(null as any, null as any, {
  // @ts-expect-error
  onResize: PatchHelper.OverrideExisting((next) => function (width: number, height: number) {
    console.log("Resizing canvas")

    // @ts-expect-error
    next.call(this, width, height)
  }),
  onDoubleClick: (next) => function (event: MouseEvent) {
    console.log("Double click")
    next.call(this, event)
  },
  createFileNode: (next) => function (file: File) {
    // @ts-expect-error
    return next?.(file, null, "dfsaf")
  },
  // @ts-expect-error
  getData: (next) => function (...args: any[]) {
    console.log("Getting data")
    return 0
  },
  createTextNode: (next) => function (text: Record<string, any>) {
    console.log("Creating text node")
    return next.call(this, text)
  },
  createGroupNode: PatchHelper.OverrideExisting((next) => function (options: Record<string, any>) {
    console.log("Creating group node")
    return next.call(this, options)
  })
})

PatchHelper.patchPrototype<Canvas>(null as any, null as any, {
  createTextNode: PatchHelper.OverrideExisting((next) => function (text: Record<string, any>) {
    console.log("Creating text node")
    return 0 as any
  })
})