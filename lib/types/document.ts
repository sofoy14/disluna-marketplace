export interface ProcessDocument {
  id: string
  file_name: string
  mime_type?: string
  size_bytes: number
  status: "pending" | "processing" | "indexed" | "error"
  error_message?: string
  created_at: string
}
