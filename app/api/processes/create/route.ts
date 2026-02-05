export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { canCreateProcess } from "@/lib/billing/plan-access"
import { incrementProcessCount } from "@/db/usage-tracking"
import { ragBackendService } from "@/lib/services/rag-backend"
import { Database } from "@/supabase/types"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { env } from "@/lib/env/runtime-env"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BILLING CHECK: Verify user can create processes
    // ═══════════════════════════════════════════════════════════════════════
    if (process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true') {
      const canCreate = await canCreateProcess(user.id)

      if (!canCreate.allowed) {
        return NextResponse.json(
          {
            error: canCreate.reason || "Tu plan no permite crear más procesos",
            code: "PLAN_LIMIT_EXCEEDED",
            needsUpgrade: true
          },
          { status: 402 } // Payment Required
        )
      }
    }

    // Parse FormData
    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string || ''
    const context = formData.get('context') as string || description || ''

    // Validar campos requeridos
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre del proceso es requerido" },
        { status: 400 }
      )
    }

    // Usar description o context, pero asegurar que no esté vacío (description es NOT NULL en la BD)
    const processDescription = description.trim() || context.trim() || 'Sin descripción'

    // Obtener workspace_id del body o del query string
    const workspaceId = formData.get("workspace_id") as string | null

    console.log("📋 Creating process - workspace_id from formData:", workspaceId)
    console.log("📋 User ID:", user.id)

    let workspace

    if (workspaceId) {
      // Verificar que el workspace pertenezca al usuario
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", workspaceId)
        .eq("user_id", user.id)
        .single()

      if (workspaceError || !workspaceData) {
        console.error("❌ Workspace validation error:", workspaceError)
        return NextResponse.json(
          { error: "Workspace no encontrado o no tienes acceso" },
          { status: 404 }
        )
      }

      workspace = workspaceData
      console.log("✅ Using provided workspace:", { id: workspace.id, name: workspaceData.name })
    } else {
      // Fallback: obtener el primer workspace disponible
      const { data: workspaces, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (workspaceError || !workspaces || workspaces.length === 0) {
        console.error("❌ No workspaces found for user")
        return NextResponse.json(
          { error: "No se encontró workspace" },
          { status: 404 }
        )
      }

      workspace = workspaces[0]
      console.warn("⚠️ No se proporcionó workspace_id, usando el primer workspace disponible:", {
        id: workspace.id,
        name: workspace.name,
        totalWorkspaces: workspaces.length
      })
    }

    // Crear el proceso usando la tabla processes
    console.log("Creating process with data:", {
      user_id: user.id,
      name,
      description: context,
      workspace_id: workspace.id
    })

    // Preparar datos del proceso
    const processData: any = {
      user_id: user.id,
      name: name.trim(),
      description: processDescription,
      status: 'activo',
      workspace_id: workspace.id,
      indexing_status: 'pending' // Estado inicial de indexación
    }

    const newProcess = await supabase
      .from("processes")
      .insert([processData])
      .select()
      .single()

    if (newProcess.error) {
      console.error("Error creating process - Full error object:", JSON.stringify(newProcess.error, null, 2))
      console.error("Error message:", newProcess.error.message)
      console.error("Error code:", newProcess.error.code)
      console.error("Error details:", newProcess.error.details)
      console.error("Error hint:", newProcess.error.hint)

      return NextResponse.json(
        {
          error: "Error al crear el proceso",
          details: newProcess.error.message || 'Unknown error',
          code: newProcess.error.code,
          hint: newProcess.error.hint
        },
        { status: 500 }
      )
    }

    console.log("Process created successfully:", newProcess.data)

    // ═══════════════════════════════════════════════════════════════════════
    // USAGE TRACKING: Increment process count
    // ═══════════════════════════════════════════════════════════════════════
    if (process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true') {
      try {
        await incrementProcessCount(user.id)
        console.log(`📊 Process count incremented for user ${user.id}`)
      } catch (trackingError) {
        console.error('Error tracking process usage:', trackingError)
        // Don't fail the request for tracking errors
      }
    }

    // Ya no necesitamos actualizar el workspace_id porque lo incluimos desde el inicio

    // Si hay archivos, procesarlos
    const files: File[] = []
    const entries = Array.from(formData.entries())

    for (const [key, value] of entries) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length > 0) {
      console.log(`📂 Processing ${files.length} files for new process ${newProcess.data.id}`)

      const supabaseAdmin = createSupabaseClient<Database>(
        env.supabaseUrl(),
        env.supabaseServiceRole()
      )

      for (const file of files) {
        try {
          console.log(`Processing file: ${file.name}`)

          // 1. Upload to Supabase Storage
          // Safer generic way:
          const fileId = crypto.randomUUID()
          const storagePath = `${user.id}/${fileId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

          const { error: uploadError } = await workspace.id // Accessing workspace to ensure it exists
            ? await supabaseAdmin.storage
              .from("files")
              .upload(storagePath, file, { upsert: true })
            : { error: new Error("Workspace undefined") }

          if (uploadError) {
            console.error(`❌ Error uploading file ${file.name} to storage:`, uploadError)
            continue
          }

          // 2. Create document record
          const { data: doc, error: docError } = await supabaseAdmin
            .from("process_documents")
            .insert({
              process_id: newProcess.data.id,
              user_id: user.id,
              file_name: file.name,
              storage_path: storagePath,
              mime_type: file.type || "application/octet-stream",
              size_bytes: file.size,
              status: "pending", // Start as pending, client will trigger ingestion
              metadata: {
                source: "create_process_upload"
              }
            })
            .select()
            .single()

          if (docError || !doc) {
            console.error(`❌ Error creating document record for ${file.name}:`, docError)
            continue
          }

          console.log(`✅ File ${file.name} uploaded and registered (pending ingestion)`)

        } catch (fileError) {
          console.error(`❌ Error processing file ${file.name}:`, fileError)
        }
      }
    }

    // Return process created response
    // We do this after file processing so the client gets the final state, 
    // although for large files this might be slow. 
    // Ideally we should process async, but Vercel limits background execution.
    // For now, this is acceptable for few small files.

    return NextResponse.json({
      success: true,
      process: newProcess.data,
      message: `Proceso creado con ${files.length} archivos procesados`
    })

  } catch (error) {
    console.error("Error creating process:", error)
    return NextResponse.json(
      {
        error: "Error al crear el proceso",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
