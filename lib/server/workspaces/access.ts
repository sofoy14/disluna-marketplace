import type { SupabaseClient } from "@supabase/supabase-js"

export type WorkspaceRole = "ADMIN" | "LAWYER" | "ASSISTANT" | "VIEWER"

export interface WorkspaceAccess {
  workspaceId: string
  userId: string
  isOwner: boolean
  isMember: boolean
  role: WorkspaceRole | null
}

export async function getWorkspaceAccess(
  supabase: SupabaseClient<any>,
  workspaceId: string,
  userId: string
): Promise<WorkspaceAccess> {
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .maybeSingle()

  if (workspaceError) {
    throw new Error(`Failed to load workspace: ${workspaceError.message}`)
  }

  const isOwner = workspace?.user_id === userId
  if (isOwner) {
    return {
      workspaceId,
      userId,
      isOwner: true,
      isMember: true,
      role: "ADMIN"
    }
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()

  if (memberError) {
    throw new Error(`Failed to load workspace membership: ${memberError.message}`)
  }

  return {
    workspaceId,
    userId,
    isOwner: false,
    isMember: !!member,
    role: (member?.role as WorkspaceRole | undefined) ?? null
  }
}

export async function assertWorkspaceAccess(
  supabase: SupabaseClient<any>,
  workspaceId: string,
  userId: string
): Promise<WorkspaceAccess> {
  const access = await getWorkspaceAccess(supabase, workspaceId, userId)

  if (!access.isOwner && !access.isMember) {
    throw new Error("Access denied")
  }

  return access
}

