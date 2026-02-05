export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { ragBackendService } from '@/lib/services/rag-backend'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API Route: POST /api/rag/ingest
 * Ingesta de documentos al backend RAG
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

        // Parsear FormData
        const formData = await req.formData()
        const file = formData.get('file') as File
        const workspaceId = formData.get('workspace_id') as string
        const metadataStr = formData.get('metadata') as string

        if (!file) {
            return NextResponse.json(
                { error: 'Archivo requerido' },
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

        // Parsear metadata si existe
        let metadata: Record<string, any> | undefined
        if (metadataStr) {
            try {
                metadata = JSON.parse(metadataStr)
            } catch (e) {
                console.warn('⚠️ Error parseando metadata:', e)
            }
        }

        // Agregar información del usuario a metadata
        const enrichedMetadata = {
            ...metadata,
            user_id: user.id,
            user_email: user.email,
            uploaded_at: new Date().toISOString()
        }

        // Extract process_id from metadata if available
        const processId = metadata?.process_id

        // Ingestar documento en backend RAG
        const response = await ragBackendService.ingestDocument(
            file,
            workspaceId,
            processId,
            enrichedMetadata
        )

        return NextResponse.json({
            success: true,
            message: 'Documento ingestado correctamente',
            ...response
        })

    } catch (error: any) {
        console.error('❌ Error en /api/rag/ingest:', error)

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Error al ingestar documento',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            },
            { status: 500 }
        )
    }
}
