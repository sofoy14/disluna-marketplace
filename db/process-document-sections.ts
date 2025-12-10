import { supabase } from "@/lib/supabase/robust-client"

export const getProcessDocumentSectionsByProcessId = async (
  processId: string
) => {
  const { data: sections, error } = await supabase
    .from("process_document_sections")
    .select("*")
    .eq("process_id", processId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return sections || []
}

export const getProcessDocumentSectionsByDocumentId = async (
  documentId: string
) => {
  const { data: sections, error } = await supabase
    .from("process_document_sections")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return sections || []
}

export const deleteProcessDocumentSectionsByDocumentId = async (
  documentId: string
) => {
  const { error } = await supabase
    .from("process_document_sections")
    .delete()
    .eq("document_id", documentId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteProcessDocumentSectionsByProcessId = async (
  processId: string
) => {
  const { error } = await supabase
    .from("process_document_sections")
    .delete()
    .eq("process_id", processId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}


