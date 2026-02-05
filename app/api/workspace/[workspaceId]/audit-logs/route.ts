export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { canUserManageWorkspace } from "@/db/workspace-members"
import { getWorkspaceAuditLogs } from "@/db/workspace-audit-logs"
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
        { error: "No tienes permisos para ver auditoría" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const logs = await getWorkspaceAuditLogs(params.workspaceId, limit, offset)

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener auditoría" },
      { status: 500 }
    )
  }
}














