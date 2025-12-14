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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:26',message:'getWorkspaceById entry',data:{workspaceId,hasClient:!!client},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  // Validate that workspaceId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(workspaceId)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:30',message:'Invalid UUID format',data:{workspaceId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw new Error(`Invalid workspace ID format: ${workspaceId}`)
  }

  const supabaseClient = client || supabase

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:33',message:'Before supabase query',data:{workspaceId,usingClient:!!client},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const { data: workspace, error } = await supabaseClient
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:37',message:'After supabase query',data:{workspace:workspace?{id:workspace.id,name:workspace.name}:null,error:error?.message,code:error?.code,hasData:!!workspace,dataLength:Array.isArray(workspace)?workspace.length:workspace?1:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (!workspace) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:40',message:'Workspace not found',data:{workspaceId,error:error?.message,code:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw new Error(error?.message || 'Workspace not found')
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:43',message:'getWorkspaceById exit',data:{workspaceId,workspaceId:workspace.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:132',message:'createWorkspace entry',data:{userId:workspace.user_id,name:workspace.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  // Validate that workspace name is unique for this user
  const nameExists = await workspaceNameExists(workspace.user_id, workspace.name)
  
  if (nameExists) {
    // Generate a unique name by appending a number
    workspace.name = await generateUniqueWorkspaceName(workspace.user_id, workspace.name)
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:140',message:'Before supabase insert',data:{userId:workspace.user_id,name:workspace.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const { data: createdWorkspace, error } = await supabase
    .from("workspaces")
    .insert([workspace])
    .select("*")
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:147',message:'After supabase insert',data:{workspaceId:createdWorkspace?.id,workspaceName:createdWorkspace?.name,error:error?.message,code:error?.code,hasData:!!createdWorkspace},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:150',message:'createWorkspace error',data:{error:error.message,code:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw new Error(error.message)
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:155',message:'createWorkspace exit',data:{workspaceId:createdWorkspace.id,workspaceName:createdWorkspace.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  return createdWorkspace
}

export const updateWorkspace = async (
  workspaceId: string,
  workspace: TablesUpdate<"workspaces">,
  client?: SupabaseClient<any>
) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:178',message:'updateWorkspace entry',data:{workspaceId,hasClient:!!client,updateFields:Object.keys(workspace)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const supabaseClient = client || supabase

  // If name is being updated, validate it's unique
  if (workspace.name) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:186',message:'Validating name uniqueness',data:{workspaceId,name:workspace.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:201',message:'Before supabase update',data:{workspaceId,updateData:workspace},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const { data: updatedWorkspace, error } = await supabaseClient
    .from("workspaces")
    .update(workspace)
    .eq("id", workspaceId)
    .select("*")
    .single()

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:207',message:'After supabase update',data:{workspaceId,hasData:!!updatedWorkspace,error:error?.message,code:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:210',message:'updateWorkspace error',data:{workspaceId,error:error.message,code:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw new Error(error.message)
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'db/workspaces.ts:215',message:'updateWorkspace exit',data:{workspaceId:updatedWorkspace.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
