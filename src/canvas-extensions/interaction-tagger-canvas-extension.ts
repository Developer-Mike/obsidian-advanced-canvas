import { CanvasNode } from "src/types/Canvas"
import CanvasExtension from "./canvas-extension"

export default class InteractionTaggerCanvasExtension extends CanvasExtension {
  constructor(plugin: any) {
    super(plugin)

    this.patchWorkspaceFunction(() => this.canvas?.nodeInteractionLayer, {
      setTarget: (next: any) => function (node: CanvasNode) {
        const result = next.call(this, node)

        const targetNodeClasses = node?.nodeEl?.classList?.value
        const interactionElDataset = this.canvas?.nodeInteractionLayer?.interactionEl?.dataset
        if (!interactionElDataset) return
        interactionElDataset.targetNode = targetNodeClasses

        return result
      }
    })
  }

  onCanvasChanged(): void {}
  onNodeChanged(_node: CanvasNode): void {}
  onPopupMenuCreated(): void {}
  onCardMenuCreated(): void {}
}