export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/admin/check-admin"

export async function POST(
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

    // Obtener el estado actual del usuario
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("is_active")
      .eq("id", userId)
      .single()

    if (fetchError) throw fetchError

    // Cambiar el estado
    const { data, error } = await supabase
      .from("users")
      .update({ is_active: !currentUser.is_active })
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error suspending/activating user:", error)
    return NextResponse.json(
      { error: "Error al cambiar estado del usuario" },
      { status: 500 }
    )
  }
}

