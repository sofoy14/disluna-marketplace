export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/admin/check-admin"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    // Obtener todos los archivos con su tamaño
    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("id, user_id, name, size, tokens, created_at")

    if (filesError) {
      console.error("Error fetching files:", filesError)
      return NextResponse.json(
        { error: "Error al obtener archivos", details: filesError.message },
        { status: 500 }
      )
    }

    // Obtener file_items (que almacena el contenido real)
    const { data: fileItems, error: fileItemsError } = await supabase
      .from("file_items")
      .select("id, file_id, user_id, tokens")

    // Obtener documentos
    const { data: documents } = await supabase
      .from("documents")
      .select("id, user_id, title")

    // Obtener usuarios
    const { data: { users } } = await supabase.auth.admin.listUsers()

    // Calcular storage por usuario
    const storageByUser = await Promise.all(users?.map(async (authUser) => {
      const userFiles = files?.filter(f => f.user_id === authUser.id) || []
      const userFileItems = fileItems?.filter(fi => fi.user_id === authUser.id) || []
      const userDocuments = documents?.filter(d => d.user_id === authUser.id) || []

      // Calcular tamaño total de archivos
      const totalFileSize = userFiles.reduce((acc, f) => acc + (f.size || 0), 0)
      
      // Estimar tamaño de file_items basado en tokens (aproximación: 4 caracteres = 1 token)
      const estimatedFileItemsSize = userFileItems.reduce((acc, fi) => acc + (fi.tokens * 4), 0)

      // Estimar tamaño aproximado por tipo de contenido
      const storageBreakdown = {
        files: totalFileSize,
        file_items: estimatedFileItemsSize,
        documents: userDocuments.length * 1500, // Estimación de 1.5KB por documento
        embeddings: userFileItems.length * 1536 * 4, // Estimación para embeddings (1536 dimensiones * 4 bytes por float)
        total: totalFileSize + estimatedFileItemsSize + (userDocuments.length * 1500) + (userFileItems.length * 1536 * 4)
      }

      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", authUser.id)
        .single()

      return {
        user_id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || profile?.display_name || authUser.email?.split("@")[0] || "",
        storage: storageBreakdown,
        fileCount: userFiles.length,
        fileItemCount: userFileItems.length,
        documentCount: userDocuments.length,
        created_at: authUser.created_at
      }
    }) || [])

    return NextResponse.json({
      success: true,
      totalUsers: storageByUser.length,
      totalStorage: storageByUser.reduce((acc, u) => acc + u.storage.total, 0),
      averageStorage: storageByUser.length > 0 
        ? storageByUser.reduce((acc, u) => acc + u.storage.total, 0) / storageByUser.length 
        : 0,
      byUser: storageByUser.sort((a, b) => b.storage.total - a.storage.total)
    })
  } catch (error) {
    console.error("Error fetching storage analytics:", error)
    return NextResponse.json(
      { error: "Error al obtener métricas de storage", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

