import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from '@/lib/supabase/server-client'

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Obtener uso de modelos del usuario
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer();
  try {
    // Get user from authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const modelId = searchParams.get("model_id")
    
    // Si se especifica un modelo, obtener solo ese
    if (modelId) {
      const { data, error } = await supabase.rpc("get_model_usage_status", {
        p_user_id: user.id,
        p_model_id: modelId
      })
      
      if (error) {
        console.error("Error getting model usage status:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        usage: data?.[0] || null
      })
    }
    
    // Si no, obtener todos los modelos
    const { data, error } = await supabase.rpc("get_all_model_usage", {
      p_user_id: user.id
    })
    
    if (error) {
      console.error("Error getting all model usage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      usage: data || []
    })
    
  } catch (error: any) {
    console.error("Error in model-usage GET:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST: Verificar e incrementar uso de un modelo
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer();
  try {
    // Get user from authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { model_id, action } = body
    
    if (!model_id) {
      return NextResponse.json(
        { error: "model_id es requerido" },
        { status: 400 }
      )
    }
    
    // Si la acción es "check", solo verificar sin incrementar
    if (action === "check") {
      const { data, error } = await supabase.rpc("get_model_usage_status", {
        p_user_id: user.id,
        p_model_id: model_id
      })
      
      if (error) {
        console.error("Error checking model usage:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      const status = data?.[0]
      return NextResponse.json({
        success: true,
        can_use: status?.can_use ?? true,
        usage: status
      })
    }
    
    // Por defecto, incrementar uso
    const { data, error } = await supabase.rpc("increment_model_usage", {
      p_user_id: user.id,
      p_model_id: model_id
    })
    
    if (error) {
      console.error("Error incrementing model usage:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const result = data?.[0]
    
    if (!result?.success) {
      return NextResponse.json({
        success: false,
        can_use: false,
        error: result?.error_message || "Límite de uso alcanzado",
        usage: {
          usage_count: result?.usage_count,
          monthly_limit: result?.monthly_limit,
          remaining: result?.remaining
        }
      }, { status: 402 }) // Payment Required
    }
    
    return NextResponse.json({
      success: true,
      can_use: true,
      usage: {
        usage_count: result?.usage_count,
        monthly_limit: result?.monthly_limit,
        remaining: result?.remaining
      }
    })
    
  } catch (error: any) {
    console.error("Error in model-usage POST:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}

