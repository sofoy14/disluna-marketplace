export interface GraphNode {
  id: string
  label: string
  type: string
  properties?: Record<string, any>
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphEdge {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  label: string
  properties?: Record<string, any>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  meta?: {
    nodeCount: number
    edgeCount: number
    appliedFilters: Record<string, string>
  }
}
