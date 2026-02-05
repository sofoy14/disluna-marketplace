export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { verifyInvitationToken } from "@/db/workspace-invitations"
import { getWorkspaceById } from "@/db/workspaces"
import { getSupabaseServer } from "@/lib/supabase/server-client"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get("token")

        if (!token) {
            return NextResponse.json({ error: "Token es requerido" }, { status: 400 })
        }

        const supabaseServer = getSupabaseServer()
        const invitation = await verifyInvitationToken(token, supabaseServer)
        const workspace = await getWorkspaceById(invitation.workspace_id, supabaseServer)

        return NextResponse.json({
            invitation: {
                id: invitation.id,
                role: invitation.role,
                email: invitation.email
            },
            workspace: {
                id: workspace.id,
                name: workspace.name
            }
        })
    } catch (error: any) {
        console.error("Error verifying invitation:", error)
        return NextResponse.json(
            { error: error.message || "Error al verificar invitación" },
            { status: 400 }
        )
    }
}
