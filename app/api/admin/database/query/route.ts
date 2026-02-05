export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/admin/check-admin"

export async function POST(request: Request) {
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

    const { query } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: "Consulta SQL requerida" },
        { status: 400 }
      )
    }

    // Ejecutar consulta usando rpc o query directa
    // Nota: Esta es una implementación básica. Para producción debería incluir validación SQL
    const { data, error } = await supabase.rpc('execute_custom_query', { 
      sql_query: query 
    })

    if (error) {
      // Si la función RPC no existe, ejecutar directamente
      // CUIDADO: Esto es solo para desarrollo. En producción necesitas validación SQL
      return NextResponse.json(
        { error: "No es posible ejecutar consultas SQL directas desde esta API por seguridad" },
        { status: 400 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error executing query:", error)
    return NextResponse.json(
      { error: "Error al ejecutar consulta" },
      { status: 500 }
    )
  }
}

