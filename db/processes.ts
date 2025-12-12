import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getProcessById = async (processId: string) => {
  const { data: process, error } = await supabase
    .from("processes")
    .select("*")
    .eq("id", processId)
    .single()

  if (!process) {
    throw new Error(error?.message || "Process not found")
  }

  return process
}

export const getProcessWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error(authError?.message || "Usuario no autenticado")
  }

  const { data: processes, error } = await supabase
    .from("processes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: workspaceId,
    name: "",
    processes: processes || []
  }
}

export const getProcessWorkspacesByProcessId = async (processId: string) => {
  const { data: process, error } = await supabase
    .from("processes")
    .select(
      `
      id,
      name,
      workspaces (*)
    `
    )
    .eq("id", processId)
    .single()

  if (!process) {
    throw new Error(error?.message || "Process not found")
  }

  return process
}

export const createProcess = async (
  process: TablesInsert<"processes">,
  workspace_id: string
) => {
  const payload = {
    ...process,
    workspace_id: process.workspace_id ?? workspace_id
  }

  const { data: createdProcess, error } = await supabase
    .from("processes")
    .insert([payload])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdProcess
}

export const createProcesses = async (
  processes: TablesInsert<"processes">[],
  workspace_id: string
) => {
  const payload = processes.map(process => ({
    ...process,
    workspace_id: process.workspace_id ?? workspace_id
  }))

  const { data: createdProcesses, error } = await supabase
    .from("processes")
    .insert(payload)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  return createdProcesses
}

export const updateProcess = async (
  processId: string,
  process: TablesUpdate<"processes">
) => {
  const { data: updatedProcess, error } = await supabase
    .from("processes")
    .update(process)
    .eq("id", processId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedProcess
}

export const deleteProcess = async (processId: string) => {
  const { error } = await supabase.from("processes").delete().eq("id", processId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}
