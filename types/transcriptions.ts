import { Tables } from "@/supabase/types"

export type Transcription = Tables<"transcriptions">

export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed"

export interface TranscriptionUpload {
  file: File
  name: string
  description?: string
  workspace_id?: string
}

export interface TranscriptionChunk {
  content: string
  tokens: number
  order: number
  startTime?: number
  endTime?: number
}

export interface WhisperResponse {
  text: string
  language: string
  duration: number
}





