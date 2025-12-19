import { supabase } from "@/lib/supabase/robust-client"

export type AuditActionType =
  | 'workspace_updated'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_revoked'
  | 'invitation_resent'

export type AuditResourceType = 'workspace' | 'member' | 'invitation'

export interface WorkspaceAuditLog {
  id: string
  workspace_id: string
  actor_id: string
  action_type: AuditActionType
  resource_type: AuditResourceType
  resource_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/**
 * Log a workspace action
 */
export const logWorkspaceAction = async (
  workspaceId: string,
  actorId: string,
  actionType: AuditActionType,
  resourceType: AuditResourceType,
  options: {
    resourceId?: string
    details?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  } = {}
) => {
  const { data: log, error } = await supabase.rpc('log_workspace_action', {
    p_workspace_id: workspaceId,
    p_actor_id: actorId,
    p_action_type: actionType,
    p_resource_type: resourceType,
    p_resource_id: options.resourceId || null,
    p_details: options.details || {},
    p_ip_address: options.ipAddress || null,
    p_user_agent: options.userAgent || null
  })

  if (error) {
    console.error('Error logging workspace action:', error)
    // Don't throw - audit logging should not break the main flow
  }

  return log
}

/**
 * Get audit logs for a workspace
 */
export const getWorkspaceAuditLogs = async (
  workspaceId: string,
  limit: number = 50,
  offset: number = 0
) => {
  const { data: logs, error } = await supabase
    .from("workspace_audit_logs")
    .select(`
      *,
      actor:actor_id (
        id,
        email
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(error.message)
  }

  return logs || []
}





