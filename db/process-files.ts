import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert } from "@/supabase/types"

export const getProcessFilesByProcessId = async (
  processId: string
) => {
  const { data: processFiles, error } = await supabase
    .from("processes")
    .select(
      `
        id, 
        name, 
        files ( id, name, type, file_category, notes, file_order )
      `
    )
    .eq("id", processId)
    .single()

  if (!processFiles) {
    throw new Error(error.message)
  }

  return processFiles
}

export const createProcessFile = async (
  processFile: TablesInsert<"process_files">
) => {
  const { data: createdProcessFile, error } = await supabase
    .from("process_files")
    .insert([processFile])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdProcessFile
}

export const updateProcessFile = async (
  processId: string,
  fileId: string,
  updates: Partial<TablesInsert<"process_files">>
) => {
  const { data: updatedProcessFile, error } = await supabase
    .from("process_files")
    .update(updates)
    .eq("process_id", processId)
    .eq("file_id", fileId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedProcessFile
}

export const deleteProcessFile = async (
  processId: string,
  fileId: string
) => {
  const { error } = await supabase
    .from("process_files")
    .delete()
    .eq("process_id", processId)
    .eq("file_id", fileId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

