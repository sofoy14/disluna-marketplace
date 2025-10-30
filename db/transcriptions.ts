import { supabase } from "@/lib/supabase/robust-client"
import { Database, TablesInsert } from "@/supabase/types"
import { Transcription, TranscriptionStatus } from "@/types/transcriptions"

export async function getTranscriptionsByUserId(userId: string): Promise<Transcription[]> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTranscriptionById(id: string): Promise<Transcription | null> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return data
}

export async function createTranscription(
  transcription: TablesInsert<"transcriptions">
): Promise<Transcription> {
  const { data, error } = await supabase
    .from("transcriptions")
    .insert([transcription])
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function updateTranscription(
  id: string,
  updates: Partial<Transcription>
): Promise<Transcription> {
  const { data, error } = await supabase
    .from("transcriptions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function updateTranscriptionStatus(
  id: string,
  status: TranscriptionStatus
): Promise<void> {
  const { error } = await supabase
    .from("transcriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error
}

export async function deleteTranscription(id: string): Promise<void> {
  const { error } = await supabase
    .from("transcriptions")
    .delete()
    .eq("id", id)

  if (error) throw error
}

export async function getTranscriptionsByWorkspace(workspaceId: string): Promise<Transcription[]> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}





