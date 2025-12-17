import type { SupabaseClient } from "@supabase/supabase-js"
import { assertWorkspaceAccess, type WorkspaceAccess } from "@/src/server/workspaces/access"
import { ForbiddenError, NotFoundError } from "@/src/server/errors"

export interface ProcessAccessResult {
  process: any
  workspaceAccess: WorkspaceAccess | null
}

export async function getProcessById(
  supabase: SupabaseClient<any>,
  processId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from("processes")
    .select("id,user_id,workspace_id,name,indexing_status")
    .eq("id", processId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load process: ${error.message}`)
  }

  return data ?? null
}

export async function assertProcessAccess(
  supabase: SupabaseClient<any>,
  processId: string,
  userId: string
): Promise<ProcessAccessResult> {
  const process = await getProcessById(supabase, processId)
  if (!process) {
    throw new NotFoundError("Process not found")
  }

  if (process.workspace_id) {
    const access = await assertWorkspaceAccess(supabase, process.workspace_id, userId)
    return { process, workspaceAccess: access }
  }

  if (process.user_id !== userId) {
    throw new ForbiddenError("Access denied")
  }

  return { process, workspaceAccess: null }
}

