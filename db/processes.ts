import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getProcessById = async (processId: string) => {
  const { data: process, error } = await supabase
    .from("processes")
    .select("*")
    .eq("id", processId)
    .single()

  if (!process) {
    throw new Error(error.message)
  }

  return process
}

export const getProcessWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  console.log('🔍 getProcessWorkspacesByWorkspaceId called with workspaceId:', workspaceId)
  
  try {
    // Verificar autenticación primero
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ Auth error in getProcessWorkspacesByWorkspaceId:', authError)
      throw new Error('Usuario no autenticado')
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Obtener los procesos directamente usando el workspace_id
    const { data: processes, error } = await supabase
      .from("processes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    console.log('📊 Direct query results:', { 
      processesCount: processes?.length || 0, 
      error: error?.message,
      processes: processes?.map(p => ({ id: p.id, name: p.name, indexing_status: p.indexing_status }))
    })

    if (error) {
      console.error("❌ Error fetching processes by workspace_id:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      
      // Si falla, intentar obtener procesos a través de process_workspaces
      const { data: processWorkspaces, error: pwError } = await supabase
        .from("process_workspaces")
        .select(`
          process_id,
          processes (*)
        `)
        .eq("workspace_id", workspaceId)

      console.log('🔄 Fallback query results:', { 
        processWorkspacesCount: processWorkspaces?.length || 0,
        pwError: pwError?.message 
      })

      if (pwError) {
        throw new Error(pwError.message)
      }

      // Extraer los procesos del resultado
      const extractedProcesses = (processWorkspaces || [])
        .map((pw: any) => pw.processes)
        .filter(Boolean)

      console.log('✅ Returning processes from fallback:', extractedProcesses.length)
      
      return {
        id: workspaceId,
        name: "",
        processes: extractedProcesses
      }
    }

    console.log('✅ Returning processes:', processes?.length || 0)
    
    // Retornar en el mismo formato que antes
    return {
      id: workspaceId,
      name: "",
      processes: processes || []
    }
  } catch (error: any) {
    console.error('❌ Exception in getProcessWorkspacesByWorkspaceId:', error)
    throw error
  }
}

export const getProcessWorkspacesByProcessId = async (
  processId: string
) => {
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
    throw new Error(error.message)
  }

  return process
}

export const createProcess = async (
  process: TablesInsert<"processes">,
  workspace_id: string
) => {
  const { data: createdProcess, error } = await supabase
    .from("processes")
    .insert([process])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createProcessWorkspace({
    user_id: createdProcess.user_id,
    process_id: createdProcess.id,
    workspace_id
  })

  return createdProcess
}

export const createProcesses = async (
  processes: TablesInsert<"processes">[],
  workspace_id: string
) => {
  const { data: createdProcesses, error } = await supabase
    .from("processes")
    .insert(processes)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createProcessWorkspaces(
    createdProcesses.map(process => ({
      user_id: process.user_id,
      process_id: process.id,
      workspace_id
    }))
  )

  return createdProcesses
}

export const createProcessWorkspace = async (item: {
  user_id: string
  process_id: string
  workspace_id: string
}) => {
  const { data: createdProcessWorkspace, error } = await supabase
    .from("process_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdProcessWorkspace
}

export const createProcessWorkspaces = async (
  items: { user_id: string; process_id: string; workspace_id: string }[]
) => {
  const { data: createdProcessWorkspaces, error } = await supabase
    .from("process_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdProcessWorkspaces
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
  const { error } = await supabase
    .from("processes")
    .delete()
    .eq("id", processId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteProcessWorkspace = async (
  processId: string,
  workspaceId: string
) => {
  const { error } = await supabase
    .from("process_workspaces")
    .delete()
    .eq("process_id", processId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}

