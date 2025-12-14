import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getWorkspaceById } from "@/db/workspaces"
import { canUserManageWorkspace, getWorkspaceMember } from "@/db/workspace-members"
import { updateWorkspace } from "@/db/workspaces"
import { logWorkspaceAction } from "@/db/workspace-audit-logs"
import { getSupabaseServer } from "@/lib/supabase/server-client"

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:10',message:'GET settings entry',data:{workspaceId:params.workspaceId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:23',message:'Before getWorkspaceById',data:{workspaceId:params.workspaceId,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const workspace = await getWorkspaceById(params.workspaceId, supabase)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:24',message:'After getWorkspaceById',data:{workspaceId:workspace?.id,userId:workspace?.user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Check if user is workspace owner
    const isOwner = workspace.user_id === user.id

    // Check if user is a member of the workspace
    const supabaseServer = getSupabaseServer()
    let isMember = false
    try {
      await getWorkspaceMember(params.workspaceId, user.id, supabaseServer)
      isMember = true
    } catch {
      // Not a member
    }

    // Allow access if user is owner or member
    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "No tienes permisos para acceder a esta configuración" },
        { status: 403 }
      )
    }

    return NextResponse.json({ workspace })
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:47',message:'GET settings error',data:{workspaceId:params.workspaceId,error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("Error fetching workspace settings:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener configuración" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:68',message:'PATCH settings entry',data:{workspaceId:params.workspaceId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:82',message:'Before parse body',data:{workspaceId:params.workspaceId,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const body = await request.json()
    const { name, description, image_path, instructions } = body

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:85',message:'After parse body',data:{workspaceId:params.workspaceId,hasName:name!==undefined,hasDescription:description!==undefined,hasImagePath:image_path!==undefined,hasInstructions:instructions!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Check permissions using server client
    const supabaseServer = getSupabaseServer()
    const canManage = await canUserManageWorkspace(params.workspaceId, user.id, supabaseServer)

    // Update workspace
    const updateData: any = {}
    
    // Only admins can update name, description, and image
    if (canManage) {
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (image_path !== undefined && image_path !== "") updateData.image_path = image_path
    }
    
    // All members can update instructions
    if (instructions !== undefined) updateData.instructions = instructions

    // If no admin fields are being updated and user is not admin, check if they're a member
    if (!canManage && (name !== undefined || description !== undefined || image_path !== undefined)) {
      return NextResponse.json(
        { error: "No tienes permisos para editar esta configuración" },
        { status: 403 }
      )
    }

    // Check if user is at least a member (for instructions update)
    if (!canManage && instructions !== undefined) {
      try {
        await getWorkspaceMember(params.workspaceId, user.id, supabaseServer)
      } catch {
        return NextResponse.json(
          { error: "No tienes permisos para editar este workspace" },
          { status: 403 }
        )
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:92',message:'Before updateWorkspace',data:{workspaceId:params.workspaceId,updateData,canManage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const updatedWorkspace = await updateWorkspace(params.workspaceId, updateData, supabase)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:93',message:'After updateWorkspace',data:{workspaceId:updatedWorkspace?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Log action
    await logWorkspaceAction(
      params.workspaceId,
      user.id,
      'workspace_updated',
      'workspace',
      {
        details: updateData,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    )

    return NextResponse.json({ workspace: updatedWorkspace })
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/workspace/[workspaceId]/settings/route.ts:108',message:'PATCH settings error',data:{workspaceId:params.workspaceId,error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("Error updating workspace:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar workspace" },
      { status: 500 }
    )
  }
}
