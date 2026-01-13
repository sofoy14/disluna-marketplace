import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isWorkspaceAdmin } from "@/db/workspace-members"
import { getWorkspaceById } from "@/db/workspaces"
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

    // Check if user is workspace owner
    const workspace = await getWorkspaceById(params.workspaceId, supabase)
    const isOwner = workspace.user_id === user.id

    // Check if user is admin member
    const supabaseServer = getSupabaseServer()
    const isAdminMember = await isWorkspaceAdmin(params.workspaceId, user.id, supabaseServer)

    const isAdmin = isOwner || isAdminMember

    return NextResponse.json({ isAdmin })
  } catch (error: any) {
    console.error("Error checking admin status:", error)
    return NextResponse.json(
      { error: error.message || "Error al verificar permisos" },
      { status: 500 }
    )
  }
}
