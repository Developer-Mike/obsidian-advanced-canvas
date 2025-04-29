import { CanvasData, CanvasEdgeData } from "src/@types/AdvancedJsonCanvas"

export const CURRENT_SPEC_VERSION = '1.0-1.0'

export default class MigrationHelper {
  private static MIGRATIONS: Record<string, (canvas: CanvasData) => { version: string, canvas: CanvasData }> = {
    undefined: (canvas: CanvasData) => {
      const TARGET_SPEC_VERSION = '1.0-1.0'

      // Move 'isStartNode' to metadata
      let startNode: string | undefined

      // Move 'edgesToNodeFromPortal' to 'interdimensionalEdges'
      const globalInterdimensionalEdges: { [portalId: string]: CanvasEdgeData[] } = {}

      // Rename node properties
      for (const node of canvas.nodes as any[]) {
        node.dynamicHeight = node.autoResizeHeight
        delete node.autoResizeHeight

        node.ratio = node.sideRatio
        delete node.sideRatio

        node.collapsed = node.isCollapsed
        delete node.isCollapsed

        if (node.portalToFile) {
          node.portal = true
          delete node.portalToFile
        }

        if (node.isStartNode) {
          startNode = node.id
          delete node.isStartNode
        }

        // edgesToNodeFromPortal?: { [key: string]: CanvasEdgeData[] }
        if (node.edgesToNodeFromPortal) {
          const edgesToNodeFromPortal = node.edgesToNodeFromPortal as { [portalId: string]: CanvasEdgeData[] }

          for (const [portalId, edges] of Object.entries(edgesToNodeFromPortal)) {
            // Create a new entry for the portal if it doesn't exist yet
            if (!(portalId in globalInterdimensionalEdges)) globalInterdimensionalEdges[portalId] = []

            // Update edges 'fromNode'/'toNode' properties to differentiate which node is from the portal
            for (const edge of edges) {
              if (edge.fromNode !== node.id) edge.fromNode = `${portalId}-${edge.fromNode}`
              if (edge.toNode !== node.id) edge.toNode = `${portalId}-${edge.toNode}`
            }

            // Add edges to the global interdimensional edges
            globalInterdimensionalEdges[portalId].push(...edges)
          }

          delete node.edgesToNodeFromPortal
        }
      }

      // Distribute global interdimensional edges to portals
      for (const node of canvas.nodes as any[]) {
        if (!(node.id in globalInterdimensionalEdges)) continue
        node.interdimensionalEdges = globalInterdimensionalEdges[node.id]
      }

      // Add metadata node
      canvas.metadata ??= {
        version: TARGET_SPEC_VERSION, 
        frontmatter: {},
        startNode: startNode
      }

      return { version: TARGET_SPEC_VERSION, canvas: canvas }
    }
  }
  
  static needsMigration(canvas: CanvasData): boolean {
    return canvas.metadata?.version !== CURRENT_SPEC_VERSION
  }

  static migrate(canvas: CanvasData): CanvasData {
    let version = canvas.metadata?.version ?? 'undefined'

    // Already migrated
    if (version === CURRENT_SPEC_VERSION) return canvas

    // Migrate canvas while version is not the current version
    while (version !== CURRENT_SPEC_VERSION) {
      const migrationFunction = MigrationHelper.MIGRATIONS[version]
      if (!migrationFunction) {
        console.error(`No migration function found for version ${version}. Critical error!`)
        break
      }

      // Migrate canvas
      const { version: newVersion, canvas: migratedCanvas } = migrationFunction(canvas)

      // Update version and canvas
      version = newVersion as any
      canvas = migratedCanvas

      // Update metadata node
      if (!canvas.metadata) canvas.metadata = { version: version, frontmatter: {} }
      else canvas.metadata.version = version
    }

    return canvas
  }
}