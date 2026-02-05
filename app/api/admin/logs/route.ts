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

    // Obtener logs de admin_actions (si la tabla existe)
    const { data: logs, error } = await supabase
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      // Si la tabla no existe aún, retornar array vacío
      console.log("Tabla admin_actions no disponible aún:", error.message)
      return NextResponse.json([])
    }

    return NextResponse.json(logs || [])
  } catch (error) {
    console.error("Error fetching admin logs:", error)
    return NextResponse.json([])
  }
}

