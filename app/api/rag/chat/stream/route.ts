import { NextRequest } from 'next/server'
import { ragBackendService } from '@/lib/services/rag-backend'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API Route: POST /api/rag/chat/stream
 * Chat con streaming (Server-Sent Events) usando el backend RAG
 */
export async function POST(req: NextRequest) {
    try {
        // Verificar autenticación
        const supabase = await createClient(cookies())
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'No autorizado' }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Parsear request body
        const body = await req.json()
        const { message, search_type = 'hybrid', workspace_id, process_id } = body

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Mensaje requerido' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Verificar configuración
        if (!ragBackendService.isConfigured()) {
            return new Response(
                JSON.stringify({ error: 'Backend RAG no configurado' }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Obtener stream del backend RAG
        const backendStream = await ragBackendService.streamChat({
            message,
            search_type,
            workspace_id,
            process_id
        })

        // Crear ReadableStream para pasar al cliente
        const stream = new ReadableStream({
            async start(controller) {
                const reader = backendStream.getReader()
                const decoder = new TextDecoder()

                try {
                    while (true) {
                        const { done, value } = await reader.read()

                        if (done) {
                            controller.close()
                            break
                        }

                        // Decodificar chunk y enviarlo al cliente
                        const chunk = decoder.decode(value, { stream: true })
                        controller.enqueue(new TextEncoder().encode(chunk))
                    }
                } catch (error) {
                    console.error('❌ Error en streaming:', error)
                    controller.error(error)
                } finally {
                    reader.releaseLock()
                }
            }
        })

        // Retornar stream con headers apropiados para SSE
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        })

    } catch (error: any) {
        console.error('❌ Error en /api/rag/chat/stream:', error)

        return new Response(
            JSON.stringify({
                error: error.message || 'Error al procesar streaming',
                details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}
