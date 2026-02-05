import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"
import crypto from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

function getDbClient(client?: SupabaseClient<any>) {
  return (client || (supabase as any)) as SupabaseClient<any>
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
export type WorkspaceRole = 'ADMIN' | 'LAWYER' | 'ASSISTANT' | 'VIEWER'

export interface WorkspaceInvitation {
  id: string
  workspace_id: string
  invited_by: string
  email: string
  role: WorkspaceRole
  token_hash: string
  status: InvitationStatus
  created_at: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
}

/**
 * Generate a secure invitation token
 */
export const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash invitation token for storage
 */
export const hashInvitationToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Create a new invitation
 */
export const createWorkspaceInvitation = async (
  invitation: Omit<TablesInsert<"workspace_invitations">, 'token_hash' | 'status'>,
  client?: SupabaseClient<any>
) => {
  const token = generateInvitationToken()
  const tokenHash = hashInvitationToken(token)

  const supabaseClient = getDbClient(client)

  const { data: newInvitation, error } = await supabaseClient
    .from("workspace_invitations")
    .insert([{
      ...invitation,
      token_hash: tokenHash,
      status: 'PENDING',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return { invitation: newInvitation, token }
}

/**
 * Get all invitations for a workspace
 */
export const getWorkspaceInvitations = async (
  workspaceId: string,
  client?: SupabaseClient<any>
) => {
  const supabaseClient = getDbClient(client)
  const { data: invitations, error } = await supabaseClient
    .from("workspace_invitations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return invitations || []
}

/**
 * Get invitation by token hash
 */
export const getInvitationByTokenHash = async (
  tokenHash: string,
  client?: SupabaseClient<any>
) => {
  const supabaseClient = getDbClient(client)
  const { data: invitation, error } = await supabaseClient
    .from("workspace_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return invitation
}

/**
 * Verify invitation token
 */
export const verifyInvitationToken = async (
  token: string,
  client?: SupabaseClient<any>
) => {
  const tokenHash = hashInvitationToken(token)
  const invitation = await getInvitationByTokenHash(tokenHash, client)

  if (!invitation) {
    throw new Error("Invitación no encontrada")
  }

  if (invitation.status !== 'PENDING') {
    throw new Error(`Invitación ${invitation.status.toLowerCase()}`)
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Auto-expire
    await updateInvitationStatus(invitation.id, 'EXPIRED', undefined, client)
    throw new Error("Invitación expirada")
  }

  return invitation
}

/**
 * Update invitation status
 */
export const updateInvitationStatus = async (
  invitationId: string,
  status: InvitationStatus,
  acceptedBy?: string,
  client?: SupabaseClient<any>
) => {
  const supabaseClient = getDbClient(client)
  const updateData: TablesUpdate<"workspace_invitations"> = {
    status,
    ...(status === 'ACCEPTED' && acceptedBy
      ? { accepted_at: new Date().toISOString(), accepted_by: acceptedBy }
      : {})
  }

  const { data: updatedInvitation, error } = await supabaseClient
    .from("workspace_invitations")
    .update(updateData)
    .eq("id", invitationId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedInvitation
}

/**
 * Revoke an invitation
 */
export const revokeInvitation = async (
  invitationId: string,
  client?: SupabaseClient<any>
) => {
  return await updateInvitationStatus(invitationId, 'REVOKED', undefined, client)
}

/**
 * Resend invitation (create new token for existing invitation)
 */
export const resendInvitation = async (
  invitationId: string,
  client?: SupabaseClient<any>
) => {
  const token = generateInvitationToken()
  const tokenHash = hashInvitationToken(token)

  const supabaseClient = getDbClient(client)
  const { data: invitation, error } = await supabaseClient
    .from("workspace_invitations")
    .update({
      token_hash: tokenHash,
      status: 'PENDING',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq("id", invitationId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return { invitation, token }
}

/**
 * Accept invitation and create membership
 */
export const acceptInvitation = async (
  token: string,
  userId: string,
  client?: SupabaseClient<any>
) => {
  const supabaseClient = getDbClient(client)
  const invitation = await verifyInvitationToken(token, client)

  // Check if user already is a member
  const { data: existingMember } = await supabaseClient
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", invitation.workspace_id)
    .eq("user_id", userId)
    .single()

  if (existingMember) {
    throw new Error("Ya eres miembro de este workspace")
  }

  // Create membership
  const { data: member, error: memberError } = await supabaseClient
    .from("workspace_members")
    .insert([{
      workspace_id: invitation.workspace_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by
    }])
    .select("*")
    .single()

  if (memberError) {
    throw new Error(memberError.message)
  }

  // Mark invitation as accepted
  await updateInvitationStatus(invitation.id, 'ACCEPTED', userId, client)

  return member
}














