/**
 * Endpoint unificado para el Tools Agent de búsqueda web
 * Implementa el contrato de integración especificado
 */

import { NextRequest, NextResponse } from "next/server"
import { WebSearchToolsAgent } from "@/lib/agents/web-search-tools-agent"

export const maxDuration = 60 // 60 segundos para tool calling

interface RequestBody {
  chatSettings: {
    model: string
  }
  messages: Array<{
    role: string
    content: string
  }>
  chatId?: string
  userId?: string
}

/**
 * Detecta el tipo de fuente basándose en la URL
 */
function detectSourceType(url: string, title: string): string {
  const urlLower = url.toLowerCase()
  const titleLower = title.toLowerCase()
  
  if (urlLower.includes('corteconstitucional.gov.co') || titleLower.includes('corte constitucional')) {
    return 'sentencia constitucional'
  }
  if (urlLower.includes('consejodeestado.gov.co') || titleLower.includes('consejo de estado')) {
    return 'sentencia administrativa'
  }
  if (urlLower.includes('suin-juriscol.gov.co') || titleLower.includes('ley') || titleLower.includes('decreto')) {
    return 'norma legal'
  }
  if (urlLower.includes('imprenta.gov.co') || titleLower.includes('diario oficial')) {
    return 'documento oficial'
  }
  if (urlLower.includes('superfinanciera.gov.co') || titleLower.includes('superintendencia')) {
    return 'circular financiera'
  }
  if (urlLower.includes('minjusticia.gov.co') || titleLower.includes('ministerio')) {
    return 'documento ministerial'
  }
  
  return 'documento web'
}

/**
 * Extrae el último mensaje del usuario
 */
function extractLastUserMessage(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter(m => m.role === 'user')
  return userMessages[userMessages.length - 1]?.content || ""
}

export async function POST(request: NextRequest) {
  try {
    const { chatSettings, messages, chatId, userId } = (await request.json()) as RequestBody

    // Validar API key
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API Key no configurada. Define OPENROUTER_API_KEY." },
        { status: 500 }
      )
    }

    // Validar Serper API key
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      return NextResponse.json(
        { error: "Serper API Key no configurada. Define SERPER_API_KEY." },
        { status: 500 }
      )
    }

    const userQuery = extractLastUserMessage(messages)
    const modelName = chatSettings.model || "gpt-4o-mini"
    
    // Generar IDs únicos si no se proporcionan
    const finalChatId = chatId || `tools-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const finalUserId = userId || "usuario-anonimo"

    console.log(`\n🤖 TOOLS AGENT ENDPOINT`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`💬 Chat ID: ${finalChatId}`)
    console.log(`👤 User ID: ${finalUserId}`)
    console.log(`🤖 Modelo: ${modelName}`)
    console.log(`🔧 Herramientas: serperSearch, httpFetch`)
    console.log(`${'='.repeat(80)}`)

    // Ejecutar el Tools Agent con verificación multi-búsqueda
    console.log(`🤖 Ejecutando Tools Agent con verificación multi-búsqueda`)
    
    // Inicializar Tools Agent
    const toolsAgent = new WebSearchToolsAgent({
      apiKey,
      model: modelName,
      temperature: 0.2,
      maxTokens: 2000
    })

    // Procesar consulta con tool calling
    const agentResponse = await toolsAgent.processQuery(userQuery)

    console.log(`✅ Tools Agent completado`)
    console.log(`📊 Respuesta: ${agentResponse.text.substring(0, 100)}...`)
    console.log(`🔗 Fuentes: ${agentResponse.sources.length}`)

    // Guardar en memoria si es necesario (opcional)
    if (finalChatId && finalUserId) {
      // Aquí podrías implementar guardado en memoria usando ChatMemoryManager
      console.log(`💾 Memoria: Guardando contexto para chat ${finalChatId}`)
    }

    return NextResponse.json({
      message: agentResponse.text,
      bibliography: agentResponse.sources.map(source => ({
        id: source.id,
        title: source.title,
        url: source.url,
        type: detectSourceType(source.url, source.title),
        description: source.summary
      }))
    })

  } catch (error) {
    console.error(`❌ Error en Tools Agent endpoint:`, error)
    
    return NextResponse.json(
      { 
        message: "Lo siento, hubo un error procesando tu consulta. Por favor, intenta reformular tu pregunta.",
        bibliography: [],
        error: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}
