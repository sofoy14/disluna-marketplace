export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getSupabaseServer } from "@/lib/supabase/server-client"
import { hashInvitationToken, updateInvitationStatus, acceptInvitation } from "@/db/workspace-invitations"
import { logWorkspaceAction } from "@/db/workspace-audit-logs"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as any))
    const token = typeof body?.token === "string" ? body.token.trim() : ""
    if (!token) {
      return NextResponse.json({ error: "token es requerido" }, { status: 400 })
    }

    const supabaseServer = getSupabaseServer()
    const tokenHash = hashInvitationToken(token)

    const { data: invitation, error: invitationError } = await supabaseServer
      .from("workspace_invitations")
      .select("id, workspace_id, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle()

    if (invitationError) {
      return NextResponse.json(
        { error: invitationError.message || "Error al validar invitación" },
        { status: 500 }
      )
    }

    if (!invitation) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 })
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invitación ${String(invitation.status).toLowerCase()}` },
        { status: 400 }
      )
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await updateInvitationStatus(invitation.id, "EXPIRED", undefined, supabaseServer)
      return NextResponse.json({ error: "Invitación expirada" }, { status: 400 })
    }

    const { data: existingMember, error: memberError } = await supabaseServer
      .from("workspace_members")
      .select("id, workspace_id, role")
      .eq("workspace_id", invitation.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message || "Error al validar membresía" },
        { status: 500 }
      )
    }

    if (existingMember) {
      return NextResponse.json({
        workspaceId: invitation.workspace_id,
        alreadyMember: true
      })
    }

    const member = await acceptInvitation(token, user.id, supabaseServer)

    await logWorkspaceAction(invitation.workspace_id, user.id, "invitation_accepted", "invitation", {
      resourceId: invitation.id,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined
    })

    return NextResponse.json({ workspaceId: member.workspace_id, member })
  } catch (error: any) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: error.message || "Error al aceptar invitación" },
      { status: 500 }
    )
  }
}

