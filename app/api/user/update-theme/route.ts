export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Verificar autenticación
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { themeMode, customPrimaryColor, selectedPalette, selectedShader } = body

    // Validar datos
    if (themeMode && !['dark', 'light'].includes(themeMode)) {
      return NextResponse.json(
        { error: 'Tema inválido' },
        { status: 400 }
      )
    }

    const validPalettes = ['purple', 'blue', 'green', 'red', 'orange', 'teal', 'yellow']
    if (selectedPalette && !validPalettes.includes(selectedPalette)) {
      return NextResponse.json(
        { error: 'Paleta inválida' },
        { status: 400 }
      )
    }

    // Validar formato de color hex
    if (customPrimaryColor && !/^#[0-9A-Fa-f]{6}$/.test(customPrimaryColor)) {
      return NextResponse.json(
        { error: 'Color inválido. Debe ser formato hex (ej: #8b5cf6)' },
        { status: 400 }
      )
    }

    // Validar shader (1-10)
    if (selectedShader !== undefined && (typeof selectedShader !== 'number' || selectedShader < 1 || selectedShader > 10)) {
      return NextResponse.json(
        { error: 'Shader inválido. Debe ser un número entre 1 y 10' },
        { status: 400 }
      )
    }

    // Actualizar perfil
    const updateData: any = {}
    if (themeMode) updateData.theme_mode = themeMode
    if (customPrimaryColor) updateData.custom_primary_color = customPrimaryColor
    if (selectedPalette) updateData.selected_palette = selectedPalette
    if (selectedShader !== undefined) updateData.selected_shader = selectedShader

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay datos para actualizar' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error actualizando perfil:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar preferencias' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas correctamente'
    })
  } catch (error) {
    console.error('Error en update-theme:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

