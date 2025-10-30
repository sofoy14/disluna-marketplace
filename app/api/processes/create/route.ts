import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

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

    // Parse FormData
    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string || ''
    const context = formData.get('context') as string
    
    // Validar campos requeridos
    if (!name || !context) {
      return NextResponse.json(
        { error: "Nombre y contexto del proceso son requeridos" },
        { status: 400 }
      )
    }

    // Obtener workspace actual
    const { data: workspaces, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", user.id)

    if (workspaceError || !workspaces || workspaces.length === 0) {
      return NextResponse.json(
        { error: "No se encontró workspace" },
        { status: 404 }
      )
    }

    // Usar el primer workspace disponible
    const workspace = workspaces[0]

    // Crear el proceso usando la tabla processes
    console.log("Creating process with data:", {
      user_id: user.id,
      name,
      description: context,
      workspace_id: workspace.id
    })

    const newProcess = await supabase
      .from("processes")
      .insert([{
        user_id: user.id,
        name,
        description: context, // Guardamos el contexto en description
        status: 'activo', // Estado por defecto
        workspace_id: workspace.id // Asociar al workspace desde el inicio
      }])
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

    // Crear la relación process_workspace (para compatibilidad con tabla de unión)
    const { error: pwError } = await supabase
      .from("process_workspaces")
      .insert([{
        user_id: user.id,
        process_id: newProcess.data.id,
        workspace_id: workspace.id
      }])

    console.log("Process workspace relation created:", { 
      process_id: newProcess.data.id, 
      workspace_id: workspace.id,
      error: pwError 
    })

    if (pwError) {
      console.error("Error creating process_workspace relation:", pwError)
      // No fallar el proceso si solo falla la relación, pero registrar el error
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

    // TODO: Implementar subida de archivos y procesamiento de ZIP
    // Por ahora solo retornamos el proceso creado

    return NextResponse.json({
      success: true,
      process: newProcess.data,
      message: "Proceso creado exitosamente"
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
