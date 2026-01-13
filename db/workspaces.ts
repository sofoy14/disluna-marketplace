import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface WorkspaceCreationResult {
  success: boolean;
  workspace?: any;
  error?: string;
  needsUpgrade?: boolean;
}

export const getHomeWorkspaceByUserId = async (userId: string) => {
  const { data: homeWorkspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("is_home", true)
    .single()

  if (!homeWorkspace) {
    throw new Error(error?.message || 'Home workspace not found')
  }

  return homeWorkspace.id
}

export const getWorkspaceById = async (
  workspaceId: string,
  client?: SupabaseClient<any>
) => {

  // Validate that workspaceId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(workspaceId)) {

    throw new Error(`Invalid workspace ID format: ${workspaceId}`)
  }

  const supabaseClient = client || supabase


  const { data: workspace, error } = await supabaseClient
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single()



  if (!workspace) {

    throw new Error(error?.message || 'Workspace not found')
  }


  return workspace
}

export const getWorkspacesByUserId = async (userId: string) => {
  // 1. Get workspaces where user is a member
  const { data: memberships, error: membershipsError } = await (supabase as any)
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)

  if (membershipsError) {
    throw new Error(membershipsError.message)
  }

  // 2. Get workspaces owned by user (just in case trigger failed or for redundancy)
  const { data: ownedWorkspaces, error: ownedError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)

  if (ownedError) {
    throw new Error(ownedError.message)
  }

  // 3. Combine unique IDs
  const memberWorkspaceIds = (memberships || []).map((m: any) => m.workspace_id)
  const ownedWorkspaceIds = (ownedWorkspaces || []).map((w: any) => w.id)

  const allWorkspaceIds = Array.from(
    new Set([...memberWorkspaceIds, ...ownedWorkspaceIds])
  ).filter(Boolean)

  if (allWorkspaceIds.length === 0) {
    return []
  }

  // 4. Fetch full workspace details
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", allWorkspaceIds as string[])
    .order("created_at", { ascending: false })

  if (!workspaces) {
    throw new Error(error?.message || "Failed to load workspaces")
  }

  return workspaces
}

/**
 * Check if a workspace name already exists for a user
 * @param userId - The user ID
 * @param name - The workspace name to check
 * @param excludeWorkspaceId - Optional workspace ID to exclude from the check (for updates)
 * @returns true if name exists, false otherwise
 */
export const workspaceNameExists = async (
  userId: string,
  name: string,
  excludeWorkspaceId?: string
): Promise<boolean> => {
  let query = supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name.trim())

  if (excludeWorkspaceId) {
    query = query.neq("id", excludeWorkspaceId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking workspace name:', error)
    return false
  }

  return (data?.length || 0) > 0
}

/**
 * Generate a unique workspace name by appending a number if needed
 * @param userId - The user ID
 * @param baseName - The base name to use
 * @returns A unique workspace name
 */
export const generateUniqueWorkspaceName = async (
  userId: string,
  baseName: string
): Promise<string> => {
  let uniqueName = baseName.trim()
  let counter = 1

  while (await workspaceNameExists(userId, uniqueName)) {
    uniqueName = `${baseName.trim()} (${counter})`
    counter++
  }

  return uniqueName
}

export const createWorkspace = async (
  workspace: TablesInsert<"workspaces">
) => {

  // Validate that workspace name is unique for this user
  const nameExists = await workspaceNameExists(workspace.user_id, workspace.name)

  if (nameExists) {
    // Generate a unique name by appending a number
    workspace.name = await generateUniqueWorkspaceName(workspace.user_id, workspace.name)
  }


  const { data: createdWorkspace, error } = await supabase
    .from("workspaces")
    .insert([workspace])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  // Ensure member is created (redundancy for SQL trigger)
  try {
    await (supabase as any)
      .from("workspace_members")
      .insert({
        workspace_id: createdWorkspace.id,
        user_id: workspace.user_id,
        role: "ADMIN"
      })
  } catch (err) {
    // Ignore error if trigger already created it
    console.log("Member creation redundant or failed:", err)
  }

  return createdWorkspace
}

export const updateWorkspace = async (
  workspaceId: string,
  workspace: TablesUpdate<"workspaces">,
  client?: SupabaseClient<any>
) => {

  const supabaseClient = client || supabase

  // If name is being updated, validate it's unique
  if (workspace.name) {

    // First, get the current workspace to get the user_id
    const currentWorkspace = await getWorkspaceById(workspaceId, supabaseClient)

    const nameExists = await workspaceNameExists(
      currentWorkspace.user_id,
      workspace.name,
      workspaceId // Exclude current workspace from check
    )

    if (nameExists) {
      throw new Error(`Ya existe un espacio de trabajo con el nombre "${workspace.name}". Por favor, elige un nombre diferente.`)
    }
  }


  const { data: updatedWorkspace, error } = await supabaseClient
    .from("workspaces")
    .update(workspace)
    .eq("id", workspaceId)
    .select("*")
    .single()



  if (error) {

    throw new Error(error.message)
  }


  return updatedWorkspace
}

export const deleteWorkspace = async (workspaceId: string) => {
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

/**
 * Get workspace count for a user
 */
export const getWorkspaceCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("workspaces")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", userId)

  if (error) {
    console.error('Error getting workspace count:', error)
    return 0
  }

  return count || 0
}

/**
 * Check if user can create workspace based on their plan
 * Returns: { allowed: boolean, reason?: string }
 */
export const canUserCreateWorkspace = async (userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
}> => {
  // Get subscription with plan details
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plans:plan_id (
        has_multiple_workspaces,
        plan_type,
        name
      )
    `)
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subError && subError.code !== 'PGRST116') {
    console.error('Error checking subscription:', subError)
  }

  // No subscription = no workspace creation
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No tienes una suscripción activa'
    }
  }

  const plan = subscription.plans as any

  // Get current workspace count
  const currentCount = await getWorkspaceCount(userId)

  // If plan allows multiple workspaces, allow
  if (plan?.has_multiple_workspaces) {
    return { allowed: true, currentCount }
  }

  // Basic plan: only 1 workspace allowed
  if (currentCount >= 1) {
    return {
      allowed: false,
      reason: 'Tu plan solo permite un espacio de trabajo. Actualiza al Plan PRO para crear múltiples espacios.',
      currentCount
    }
  }

  return { allowed: true, currentCount }
}

/**
 * Create workspace with plan validation
 */
export const createWorkspaceWithPlanCheck = async (
  workspace: TablesInsert<"workspaces">
): Promise<WorkspaceCreationResult> => {
  // Check if user can create workspace
  const canCreate = await canUserCreateWorkspace(workspace.user_id)

  if (!canCreate.allowed) {
    return {
      success: false,
      error: canCreate.reason,
      needsUpgrade: true
    }
  }

  try {
    const createdWorkspace = await createWorkspace(workspace)
    return {
      success: true,
      workspace: createdWorkspace
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error creating workspace'
    }
  }
}
