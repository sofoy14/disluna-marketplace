import { NextRequest, NextResponse } from 'next/server'
import { ragBackendService } from '@/lib/services/rag-backend'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API Route: POST /api/rag/search
 * Búsqueda directa en el backend RAG (vector/graph/hybrid)
 */
export async function POST(req: NextRequest) {
    try {
        // Verificar autenticación
        const supabase = await createClient(cookies())
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Parsear request body
        const body = await req.json()
        const { query, search_type = 'hybrid', limit = 10, workspace_id, process_id } = body

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: 'Query requerido' },
                { status: 400 }
            )
        }

        if (!workspace_id) {
            return NextResponse.json(
                { error: 'Workspace ID requerido' },
                { status: 400 }
            )
        }

        // Verificar configuración
        if (!ragBackendService.isConfigured()) {
            return NextResponse.json(
                { error: 'Backend RAG no configurado. Agrega RAG_BACKEND_URL a las variables de entorno.' },
                { status: 503 }
            )
        }

        // Realizar búsqueda
        const results = await ragBackendService.search({
            query,
            search_type,
            limit,
            workspace_id,
            process_id
        })

        return NextResponse.json({
            success: true,
            query,
            search_type,
            count: results.length,
            results
        })

    } catch (error: any) {
        console.error('❌ Error en /api/rag/search:', error)

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error en búsqueda',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            },
            { status: 500 }
        )
    }
}
