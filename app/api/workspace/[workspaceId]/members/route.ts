import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { canUserManageWorkspace } from "@/db/workspace-members"
import {
  getWorkspaceMembers,
  updateWorkspaceMemberRole,
  removeWorkspaceMember
} from "@/db/workspace-members"
import { logWorkspaceAction } from "@/db/workspace-audit-logs"
import { getSupabaseServer } from "@/lib/supabase/server-client"

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
        { error: "No tienes permisos para ver miembros" },
        { status: 403 }
      )
    }

    const members = await getWorkspaceMembers(params.workspaceId)

    return NextResponse.json({ members })
  } catch (error: any) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener miembros" },
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

    const canManage = await canUserManageWorkspace(params.workspaceId, user.id)

    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para editar miembros" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId y role son requeridos" },
        { status: 400 }
      )
    }

    const updatedMember = await updateWorkspaceMemberRole(
      params.workspaceId,
      userId,
      role
    )

    // Log action
    await logWorkspaceAction(
      params.workspaceId,
      user.id,
      'member_role_changed',
      'member',
      {
        resourceId: userId,
        details: { role },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json({ member: updatedMember })
  } catch (error: any) {
    console.error("Error updating member role:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar rol" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
        { error: "No tienes permisos para remover miembros" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      )
    }

    await removeWorkspaceMember(params.workspaceId, userId)

    // Log action
    await logWorkspaceAction(
      params.workspaceId,
      user.id,
      'member_removed',
      'member',
      {
        resourceId: userId,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { error: error.message || "Error al remover miembro" },
      { status: 500 }
    )
  }
}













