import { supabase } from "@/lib/supabase/robust-client"
import { Tables, TablesInsert, TablesUpdate } from "@/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export type WorkspaceRole = 'ADMIN' | 'LAWYER' | 'ASSISTANT' | 'VIEWER'

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  updated_at: string | null
  invited_by: string | null
}

/**
 * Get all members of a workspace
 */
export const getWorkspaceMembers = async (workspaceId: string) => {
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return members || []
}

/**
 * Get a specific member by workspace and user ID
 * @param workspaceId - The workspace ID
 * @param userId - The user ID
 * @param client - Optional Supabase client (for server-side usage)
 */
export const getWorkspaceMember = async (
  workspaceId: string,
  userId: string,
  client?: SupabaseClient<any>
) => {
  const supabaseClient = client || supabase

  const { data: member, error } = await supabaseClient
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return member
}

/**
 * Check if user is admin of workspace
 * @param workspaceId - The workspace ID
 * @param userId - The user ID to check
 * @param client - Optional Supabase client (for server-side usage)
 */
export const isWorkspaceAdmin = async (
  workspaceId: string,
  userId: string,
  client?: SupabaseClient<any>
): Promise<boolean> => {
  const supabaseClient = client || supabase

  try {
    const member = await getWorkspaceMember(workspaceId, userId, client)
    return member?.role === 'ADMIN' || false
  } catch {
    // Check if user is workspace owner
    const { data: workspace, error } = await supabaseClient
      .from("workspaces")
      .select("user_id")
      .eq("id", workspaceId)
      .single()

    if (error) {
      console.error("Error checking workspace ownership:", error)
      return false
    }

    return workspace?.user_id === userId
  }
}

/**
 * Check if user can perform admin actions on workspace
 * @param workspaceId - The workspace ID
 * @param userId - The user ID to check
 * @param client - Optional Supabase client (for server-side usage)
 */
export const canUserManageWorkspace = async (
  workspaceId: string,
  userId: string,
  client?: SupabaseClient<any>
): Promise<boolean> => {
  const supabaseClient = client || supabase

  // Check if user is workspace owner
  const { data: workspace, error } = await supabaseClient
    .from("workspaces")
    .select("user_id")
    .eq("id", workspaceId)
    .single()

  if (error) {
    console.error("Error checking workspace ownership:", error)
    return false
  }

  if (workspace?.user_id === userId) {
    return true
  }

  // Check if user is admin member
  return await isWorkspaceAdmin(workspaceId, userId, client)
}

/**
 * Add a member to workspace
 */
export const addWorkspaceMember = async (
  member: TablesInsert<"workspace_members">
) => {
  const { data: newMember, error } = await supabase
    .from("workspace_members")
    .insert([member])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return newMember
}

/**
 * Update member role
 */
export const updateWorkspaceMemberRole = async (
  workspaceId: string,
  userId: string,
  newRole: WorkspaceRole
) => {
  // Prevent removing last admin
  if (newRole !== 'ADMIN') {
    const { count } = await supabase
      .from("workspace_members")
      .select("*", { count: 'exact', head: true })
      .eq("workspace_id", workspaceId)
      .eq("role", "ADMIN")

    if (count === 1) {
      const currentMember = await getWorkspaceMember(workspaceId, userId)
      if (currentMember?.role === 'ADMIN') {
        throw new Error("No se puede degradar al último administrador del workspace")
      }
    }
  }

  const { data: updatedMember, error } = await supabase
    .from("workspace_members")
    .update({ role: newRole })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedMember
}

/**
 * Remove a member from workspace
 */
export const removeWorkspaceMember = async (
  workspaceId: string,
  userId: string
) => {
  // Prevent removing last admin
  const member = await getWorkspaceMember(workspaceId, userId)
  if (member?.role === 'ADMIN') {
    const { count } = await supabase
      .from("workspace_members")
      .select("*", { count: 'exact', head: true })
      .eq("workspace_id", workspaceId)
      .eq("role", "ADMIN")

    if (count === 1) {
      throw new Error("No se puede remover al último administrador del workspace")
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

