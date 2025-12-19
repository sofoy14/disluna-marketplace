import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { canUserManageWorkspace } from "@/db/workspace-members"
import {
  createWorkspaceInvitation,
  getWorkspaceInvitations,
  revokeInvitation,
  resendInvitation
} from "@/db/workspace-invitations"
import { logWorkspaceAction } from "@/db/workspace-audit-logs"
import { getSupabaseServer } from "@/lib/supabase/server-client"
import crypto from "crypto"

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabaseServer = getSupabaseServer()
    const canManage = await canUserManageWorkspace(params.workspaceId, user.id, supabaseServer)

    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para ver invitaciones" },
        { status: 403 }
      )
    }

    const invitations = await getWorkspaceInvitations(params.workspaceId, supabaseServer)

    return NextResponse.json({ invitations })
  } catch (error: any) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener invitaciones" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabaseServer = getSupabaseServer()
    const canManage = await canUserManageWorkspace(params.workspaceId, user.id, supabaseServer)

    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para crear invitaciones" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, contact, role, mode, label } = body as {
      email?: unknown
      contact?: unknown
      role?: unknown
      mode?: unknown
      label?: unknown
    }

    const invitationMode = mode === 'link' ? 'link' : 'email'

    let invitee =
      invitationMode === 'email'
        ? (typeof contact === 'string' ? contact : typeof email === 'string' ? email : '').trim()
        : ''

    if (invitationMode === 'link') {
      const normalizedLabel = typeof label === 'string' ? label.trim() : ''
      invitee = normalizedLabel ? `link:${normalizedLabel}` : `link:${crypto.randomUUID()}`
    }

    if (!invitee || typeof role !== 'string') {
      return NextResponse.json(
        { error: "role es requerido" },
        { status: 400 }
      )
    }

    const { invitation, token } = await createWorkspaceInvitation({
      workspace_id: params.workspaceId,
      invited_by: user.id,
      email: invitee,
      role
    }, supabaseServer)

    // Log action
    await logWorkspaceAction(
      params.workspaceId,
      user.id,
      'invitation_sent',
      'invitation',
      {
        resourceId: invitation.id,
        details: { contact: invitee, role },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    // TODO: Send email with invitation link
    // const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
    // await sendInvitationEmail(email, inviteUrl, params.workspaceId)

    return NextResponse.json({ invitation, token })
  } catch (error: any) {
    console.error("Error creating invitation:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear invitación" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabaseServer = getSupabaseServer()
    const canManage = await canUserManageWorkspace(params.workspaceId, user.id, supabaseServer)

    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para gestionar invitaciones" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { invitationId, action } = body

    if (!invitationId || !action) {
      return NextResponse.json(
        { error: "invitationId y action son requeridos" },
        { status: 400 }
      )
    }

    if (action === 'revoke') {
      await revokeInvitation(invitationId, supabaseServer)

      await logWorkspaceAction(
        params.workspaceId,
        user.id,
        'invitation_revoked',
        'invitation',
        {
          resourceId: invitationId,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        }
      )

      return NextResponse.json({ success: true })
    } else if (action === 'resend') {
      const { invitation, token } = await resendInvitation(invitationId, supabaseServer)

      await logWorkspaceAction(
        params.workspaceId,
        user.id,
        'invitation_resent',
        'invitation',
        {
          resourceId: invitationId,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        }
      )

      // TODO: Send email with new invitation link
      // const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
      // await sendInvitationEmail(invitation.email, inviteUrl, params.workspaceId)

      return NextResponse.json({ invitation, token })
    } else {
      return NextResponse.json(
        { error: "Acción no válida" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error managing invitation:", error)
    return NextResponse.json(
      { error: error.message || "Error al gestionar invitación" },
      { status: 500 }
    )
  }
}





