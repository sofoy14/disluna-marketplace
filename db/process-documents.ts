import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getProcessDocumentsByProcessId = async (processId: string) => {
  const { data: processDocuments, error } = await supabase
    .from("process_documents")
    .select("*")
    .eq("process_id", processId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return processDocuments || []
}

export const getProcessDocumentById = async (documentId: string) => {
  const { data: document, error } = await supabase
    .from("process_documents")
    .select("*")
    .eq("id", documentId)
    .single()

  if (!document) {
    throw new Error(error?.message || "Document not found")
  }

  return document
}

export const createProcessDocument = async (
  document: TablesInsert<"process_documents">
) => {
  const { data: createdDocument, error } = await supabase
    .from("process_documents")
    .insert([document])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdDocument
}

export const createProcessDocuments = async (
  documents: TablesInsert<"process_documents">[]
) => {
  const { data: createdDocuments, error } = await supabase
    .from("process_documents")
    .insert(documents)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  return createdDocuments || []
}

export const updateProcessDocument = async (
  documentId: string,
  updates: TablesUpdate<"process_documents">
) => {
  const { data: updatedDocument, error } = await supabase
    .from("process_documents")
    .update(updates)
    .eq("id", documentId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedDocument
}

export const deleteProcessDocument = async (documentId: string) => {
  const { error } = await supabase
    .from("process_documents")
    .delete()
    .eq("id", documentId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const getProcessDocumentsByStatus = async (
  processId: string,
  status: "pending" | "processing" | "indexed" | "error"
) => {
  const { data: documents, error } = await supabase
    .from("process_documents")
    .select("*")
    .eq("process_id", processId)
    .eq("status", status)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return documents || []
}



