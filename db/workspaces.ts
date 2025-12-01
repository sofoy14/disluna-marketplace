import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

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

export const getWorkspaceById = async (workspaceId: string) => {
  // Validate that workspaceId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(workspaceId)) {
    throw new Error(`Invalid workspace ID format: ${workspaceId}`)
  }

  const { data: workspace, error } = await supabase
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
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (!workspaces) {
    throw new Error(error.message)
  }

  return workspaces
}

export const createWorkspace = async (
  workspace: TablesInsert<"workspaces">
) => {
  const { data: createdWorkspace, error } = await supabase
    .from("workspaces")
    .insert([workspace])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdWorkspace
}

export const updateWorkspace = async (
  workspaceId: string,
  workspace: TablesUpdate<"workspaces">
) => {
  const { data: updatedWorkspace, error } = await supabase
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
