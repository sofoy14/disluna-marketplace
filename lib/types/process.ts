export type IndexingStatus = "pending" | "processing" | "ready" | "error"

export type ProcessStatus = "activo" | "archivado" | "cerrado" | string

export interface Process {
  id: string
  name: string
  description?: string
  status?: ProcessStatus
  indexing_status?: IndexingStatus
  created_at: string
  updated_at?: string
  document_count?: number
  process_number?: string
  process_type?: string
  client_name?: string
  entity_count?: number
  fact_count?: number
  evidence_count?: number
  norm_count?: number
  contradiction_count?: number
  risk_level?: "low" | "medium" | "high"
}
