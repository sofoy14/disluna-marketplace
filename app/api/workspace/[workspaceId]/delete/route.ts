import { getEnvVar } from "@/lib/env/runtime-env"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { canUserManageWorkspace } from "@/db/workspace-members"
import { getSupabaseServer } from "@/lib/supabase/server-client"
import { appendFile } from "fs/promises"
import { join } from "path"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const logPath = join(process.cwd(), '.cursor', 'debug.log')
  const log = async (msg: string, data: any) => {
    const entry = JSON.stringify({location:'route.ts',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run4'}) + '\n'
    await appendFile(logPath, entry).catch(()=>{})
  }
  
  try {
    await log('DELETE handler started', {workspaceId: params.workspaceId})
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    await log('Created supabase client', {})
    
    const { data: { user } } = await supabase.auth.getUser()
    await log('Got user', {userId: user?.id, hasUser: !!user})

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Check permissions using server client
    await log('Before getSupabaseServer', {})
    const supabaseServer = getSupabaseServer()
    const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
    await log('Got supabaseServer', {
      hasClient: !!supabaseServer,
      supabaseUrl: supabaseUrl?.substring(0, 50) + '...',
      hasServiceKey: !!getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
    })
    
    await log('Before canUserManageWorkspace', {workspaceId: params.workspaceId, userId: user.id})
    const canManage = await canUserManageWorkspace(params.workspaceId, user.id, supabaseServer)
    await log('After canUserManageWorkspace', {canManage})

    if (!canManage) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este workspace" },
        { status: 403 }
      )
    }

    // Get workspace to check if it's home using server client
    await log('Before workspace query', {workspaceId: params.workspaceId})
    const { data: workspace, error: workspaceError } = await supabaseServer
      .from("workspaces")
      .select("*")
      .eq("id", params.workspaceId)
      .single()
    await log('After workspace query', {hasData: !!workspace, workspaceName: workspace?.name, isHome: workspace?.is_home, error: workspaceError?.message, errorCode: workspaceError?.code})

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: workspaceError?.message || "Workspace no encontrado" },
        { status: 404 }
      )
    }

    if (workspace.is_home) {
      return NextResponse.json(
        { error: "No se puede eliminar el workspace principal" },
        { status: 400 }
      )
    }

    // Use server client for deletion
    // The trigger has been simplified to not attempt storage deletion
    await log('Before delete operation', {
      workspaceId: params.workspaceId,
      supabaseUrl: supabaseUrl?.substring(0, 50) + '...'
    })
    
    const { error } = await supabaseServer
      .from("workspaces")
      .delete()
      .eq("id", params.workspaceId)
    await log('After delete operation', {
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint
    })
    
    if (error) {
      await log('Delete error thrown', {error: error.message})
      throw new Error(error.message)
    }

    // Log action using server client
    await log('Before audit log', {})
    try {
      await supabaseServer.rpc('log_workspace_action', {
        p_workspace_id: params.workspaceId,
        p_actor_id: user.id,
        p_action_type: 'workspace_updated',
        p_resource_type: 'workspace',
        p_resource_id: null,
        p_details: { action: 'deleted', workspaceName: workspace.name },
        p_ip_address: request.headers.get('x-forwarded-for') || null,
        p_user_agent: request.headers.get('user-agent') || null
      })
      await log('After audit log success', {})
    } catch (logError: any) {
      // Don't throw - audit logging should not break the main flow
      await log('Audit log error caught', {error: logError?.message, errorStack: logError?.stack})
      console.error('Error logging workspace action:', logError)
    }

    await log('DELETE handler success', {})
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await log('DELETE handler error caught', {error: error?.message, errorStack: error?.stack, errorName: error?.name})
    console.error("Error deleting workspace:", error)
    return NextResponse.json(
      { error: error.message || "Error al eliminar workspace" },
      { status: 500 }
    )
  }
}





