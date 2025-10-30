import { NextRequest, NextResponse } from "next/server"
import { LegalWritingAgent } from "@/lib/agents/legal-writing-agent"

export const maxDuration = 120 // Mayor tiempo para proceso iterativo

interface RequestBody {
  chatSettings: { model: string }
  messages: Array<{ role: string; content: string }>
  chatId?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    
    console.log('📝 Legal Writing Endpoint - Body recibido:', JSON.stringify(body, null, 2))
    
    const agent = new LegalWritingAgent({
      model: body.chatSettings.model,
      chatId: body.chatId,
      userId: body.userId
    })

    console.log('✅ Agente creado, iniciando procesamiento...')
    
    // Procesar con streaming
    const stream = await agent.processWithStreaming(body.messages)
    
    console.log('✅ Stream obtenido, retornando...')
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('❌ Error en legal-writing agent:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Error procesando solicitud de redacción', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

