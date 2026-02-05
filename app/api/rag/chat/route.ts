export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { ragBackendService } from '@/lib/services/rag-backend'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API Route: POST /api/rag/chat
 * Proxy para chat con el backend RAG
 */
export async function POST(req: NextRequest) {
    try {
        // Verificar autenticación del usuario
        const supabase = createClient(cookies())
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Parsear request body
        const body = await req.json()
        const { message, search_type = 'hybrid', workspace_id, process_id } = body

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Mensaje requerido' },
                { status: 400 }
            )
        }

        // Verificar que el backend RAG esté configurado
        if (!ragBackendService.isConfigured()) {
            return NextResponse.json(
                { error: 'Backend RAG no configurado. Agrega RAG_BACKEND_URL a las variables de entorno.' },
                { status: 503 }
            )
        }

        // Llamar al backend RAG
        const response = await ragBackendService.chat({
            message,
            search_type,
            workspace_id,
            process_id
        })

        return NextResponse.json(response)

    } catch (error: any) {
        console.error('❌ Error en /api/rag/chat:', error)

        return NextResponse.json(
            {
                error: error.message || 'Error al procesar la solicitud',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            },
            { status: 500 }
        )
    }
}
