export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/admin/check-admin"

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params

    // Obtener información del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError) throw userError

    // Obtener perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()

    // Obtener suscripción
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    // Obtener workspaces
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)

    // Obtener chats
    const { data: chats } = await supabase
      .from("chats")
      .select("id, name, created_at, workspace_id")
      .eq("user_id", userId)
      .limit(50)

    // Obtener archivos
    const { data: files } = await supabase
      .from("files")
      .select("id, name, type, size, created_at")
      .eq("user_id", userId)
      .limit(50)

    return NextResponse.json({
      user: userData,
      profile,
      subscription,
      workspaces,
      chats,
      files
    })
  } catch (error) {
    console.error("Error fetching user details:", error)
    return NextResponse.json(
      { error: "Error al obtener detalles del usuario" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params
    const body = await request.json()

    // Actualizar usuario
    const { data, error } = await supabase
      .from("users")
      .update(body)
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params

    // Eliminar usuario (esto también eliminará el usuario de auth por cascada)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}

