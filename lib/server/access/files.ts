import type { SupabaseClient } from "@supabase/supabase-js"
import { assertWorkspaceAccess } from "@/src/server/workspaces/access"
import { ForbiddenError, NotFoundError } from "@/src/server/errors"

export async function assertFileAccess(
  supabase: SupabaseClient<any>,
  fileId: string,
  userId: string
): Promise<any> {
  const { data: file, error } = await supabase
    .from("files")
    .select("id,user_id,workspace_id,file_path,name,mime_type")
    .eq("id", fileId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load file: ${error.message}`)
  }

  if (!file) {
    throw new NotFoundError("File not found")
  }

  if (file.workspace_id) {
    await assertWorkspaceAccess(supabase, file.workspace_id, userId)
    return file
  }

  if (file.user_id !== userId) {
    throw new ForbiddenError("Access denied")
  }

  return file
}

export async function assertFilesAccess(
  supabase: SupabaseClient<any>,
  fileIds: string[],
  userId: string
): Promise<any[]> {
  const uniqueFileIds = [...new Set(fileIds)].filter(Boolean)
  if (uniqueFileIds.length === 0) return []

  const { data: files, error } = await supabase
    .from("files")
    .select("id,user_id,workspace_id")
    .in("id", uniqueFileIds)

  if (error) {
    throw new Error(`Failed to load files: ${error.message}`)
  }

  const rows = files ?? []
  if (rows.length !== uniqueFileIds.length) {
    throw new NotFoundError("Some files were not found")
  }

  const workspaceIds = new Set<string>()
  for (const row of rows) {
    if (row.workspace_id) workspaceIds.add(row.workspace_id)
  }

  await Promise.all(
    [...workspaceIds].map(workspaceId => assertWorkspaceAccess(supabase, workspaceId, userId))
  )

  for (const row of rows) {
    if (!row.workspace_id && row.user_id !== userId) {
      throw new ForbiddenError("Access denied")
    }
  }

  return rows
}

