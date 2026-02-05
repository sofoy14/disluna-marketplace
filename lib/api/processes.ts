import { apiFetch } from "./client"
import type { GraphData } from "@/lib/types/graph"

export interface GraphQueryParams {
  status?: string
  limit?: number
  maxDepth?: number
}

export const fetchProcessGraph = async (
  processId: string,
  params: GraphQueryParams = {}
): Promise<GraphData> => {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set("status", params.status)
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.maxDepth) searchParams.set("maxDepth", String(params.maxDepth))

  const query = searchParams.toString()
  const url = query
    ? `/api/processes/${processId}/graph?${query}`
    : `/api/processes/${processId}/graph`

  return apiFetch<GraphData>(url)
}
