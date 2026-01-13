import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { acceptInvitation } from "@/db/workspace-invitations"
import { getSupabaseServer } from "@/lib/supabase/server-client"
import { logWorkspaceAction } from "@/db/workspace-audit-logs"

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const body = await request.json()
        const { token } = body

        if (!token) {
            return NextResponse.json({ error: "Token es requerido" }, { status: 400 })
        }

        const supabaseServer = getSupabaseServer()
        const member = await acceptInvitation(token, user.id, supabaseServer)

        // Log action
        await logWorkspaceAction(
            member.workspace_id,
            user.id,
            'invitation_accepted',
            'member',
            {
                resourceId: member.id,
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
                userAgent: request.headers.get('user-agent') || undefined
            }
        )

        return NextResponse.json({ success: true, workspaceId: member.workspace_id })
    } catch (error: any) {
        console.error("Error accepting invitation:", error)
        return NextResponse.json(
            { error: error.message || "Error al aceptar invitación" },
            { status: 400 }
        )
    }
}
