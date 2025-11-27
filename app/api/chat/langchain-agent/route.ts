/**
 * Endpoint Unificado del Agente Legal con LangChain
 * 
 * Este endpoint usa LangChain para implementar un agente con tool calling nativo.
 * 
 * Características:
 * - Soporta múltiples modelos (Kimi K2, Tongyi, GPT-4o, Claude)
 * - Tool calling nativo (el modelo decide cuándo usar herramientas)
 * - Streaming de respuestas
 * - Manejo de historial de conversación
 * 
 * Modelos recomendados:
 * - moonshotai/kimi-k2: Razonamiento profundo
 * - alibaba/tongyi-deepresearch-30b-a3b: Investigación profunda
 */

import { NextRequest, NextResponse } from "next/server"
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages"
import { LegalAgent, getModelConfig, RESEARCH_MODELS } from "@/lib/langchain"

export const runtime = "nodejs"
export const maxDuration = 180 // 3 minutos para investigación completa

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface RequestBody {
  chatSettings: {
    model: string
    temperature?: number
  }
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  chatId?: string
  userId?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE DE AGENTES (por sesión)
// ═══════════════════════════════════════════════════════════════════════════════

// Cache simple de agentes por chatId para reutilizar en conversaciones
const agentCache = new Map<string, { agent: LegalAgent; lastUsed: Date }>()

// Limpiar agentes inactivos cada 10 minutos
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of agentCache.entries()) {
    if (now - value.lastUsed.getTime() > CACHE_TTL) {
      agentCache.delete(key)
    }
  }
}

// Ejecutar cleanup periódicamente (solo en el primer request)
let cleanupInterval: NodeJS.Timeout | null = null

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte mensajes del formato del chat al formato de LangChain
 */
function convertMessages(messages: RequestBody['messages']): BaseMessage[] {
  return messages
    .filter(m => m.role !== 'system') // El system prompt lo maneja el agente
    .map(msg => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content)
      } else {
        return new AIMessage(msg.content)
      }
    })
}

/**
 * Obtiene o crea un agente para un chat específico
 */
async function getOrCreateAgent(
  chatId: string, 
  modelId: string, 
  temperature: number
): Promise<LegalAgent> {
  const cacheKey = `${chatId}-${modelId}`
  
  const cached = agentCache.get(cacheKey)
  if (cached) {
    cached.lastUsed = new Date()
    console.log(`♻️ Reutilizando agente en caché: ${cacheKey}`)
    return cached.agent
  }

  console.log(`🆕 Creando nuevo agente: ${cacheKey}`)
  const agent = await LegalAgent.create({
    modelId,
    temperature,
    maxIterations: 6,
    verbose: process.env.NODE_ENV === 'development'
  })

  agentCache.set(cacheKey, { agent, lastUsed: new Date() })
  return agent
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  // Iniciar cleanup si no está corriendo
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupCache, CACHE_TTL)
  }

  console.log(`\n${'═'.repeat(80)}`)
  console.log(`🤖 LANGCHAIN AGENT - ENDPOINT UNIFICADO`)
  console.log(`${'═'.repeat(80)}`)

  try {
    const body = await request.json() as RequestBody
    const { chatSettings, messages, chatId, userId } = body

    // Validar API Key
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY no configurada" },
        { status: 500 }
      )
    }

    // Determinar modelo a usar
    const modelId = chatSettings.model || 'alibaba/tongyi-deepresearch-30b-a3b'
    const temperature = chatSettings.temperature ?? 0.3

    // Verificar que el modelo soporte tools
    const modelConfig = getModelConfig(modelId)
    if (modelConfig && !modelConfig.supportsTools) {
      console.warn(`⚠️ Modelo ${modelId} no soporta tools, usando fallback`)
      // Podrías hacer fallback a otro modelo aquí
    }

    // Extraer el último mensaje del usuario
    const userMessages = messages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

    console.log(`📝 Query: "${lastUserMessage.substring(0, 100)}..."`)
    console.log(`🤖 Modelo: ${modelId}`)
    console.log(`🌡️ Temperature: ${temperature}`)
    console.log(`💬 Chat ID: ${chatId || 'N/A'}`)
    console.log(`👤 User ID: ${userId || 'N/A'}`)

    // Obtener o crear agente
    const effectiveChatId = chatId || `temp-${Date.now()}`
    const agent = await getOrCreateAgent(effectiveChatId, modelId, temperature)

    // Convertir historial (excluyendo el último mensaje del usuario)
    const chatHistory = convertMessages(messages.slice(0, -1))

    // ═══════════════════════════════════════════════════════════════════════════
    // EJECUTAR AGENTE CON STREAMING
    // ═══════════════════════════════════════════════════════════════════════════

    console.log(`🚀 Ejecutando agente...`)

    // Crear stream de respuesta
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Ejecutar el agente (sin streaming por ahora para mayor estabilidad)
          const result = await agent.invoke({
            input: lastUserMessage,
            chatHistory
          })

          // Enviar metadata inicial
          const metadata = {
            model: modelId,
            toolsUsed: result.toolsUsed || [],
            sources: result.sources || []
          }
          
          // Simular streaming de la respuesta
          const words = result.output.split(' ')
          
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '')
            controller.enqueue(encoder.encode(word))
            
            // Pequeña pausa para efecto de streaming
            await new Promise(resolve => setTimeout(resolve, 10))
          }

          // Agregar sección de fuentes si hay
          if (result.sources && result.sources.length > 0) {
            const sourcesSection = `\n\n---\n\n**📚 Fuentes consultadas:**\n${
              result.sources.map(s => `- [${s.title}](${s.url})`).join('\n')
            }`
            controller.enqueue(encoder.encode(sourcesSection))
          }

          // Agregar metadata al final como comentario HTML (invisible pero parseable)
          const metadataComment = `\n<!-- AGENT_METADATA: ${JSON.stringify(metadata)} -->`
          controller.enqueue(encoder.encode(metadataComment))

          controller.close()

          const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
          console.log(`\n${'═'.repeat(60)}`)
          console.log(`✅ RESPUESTA COMPLETADA`)
          console.log(`   ⏱️ Tiempo: ${processingTime}s`)
          console.log(`   🔧 Tools: ${result.toolsUsed?.join(', ') || 'Ninguna'}`)
          console.log(`   📚 Fuentes: ${result.sources?.length || 0}`)
          console.log(`${'═'.repeat(60)}\n`)

        } catch (error) {
          console.error('❌ Error en streaming:', error)
          const errorMessage = `Lo siento, hubo un error procesando tu consulta. Por favor, intenta de nuevo.`
          controller.enqueue(encoder.encode(errorMessage))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Model-Used': modelId,
        'X-Processing-Started': new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error(`❌ Error en LangChain Agent:`, error)
    
    return NextResponse.json(
      { 
        error: error.message || "Error procesando la consulta",
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT GET - INFORMACIÓN DEL SERVICIO
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)
  const hasSerper = Boolean(process.env.SERPER_API_KEY)

  return NextResponse.json({
    status: "ok",
    endpoint: "LangChain Agent - Unified Legal Assistant",
    version: "1.0.0",
    features: [
      "Tool calling nativo",
      "Múltiples modelos soportados (Kimi K2, Tongyi, GPT-4o, Claude)",
      "El modelo decide autónomamente cuándo usar herramientas",
      "Streaming de respuestas",
      "Cache de agentes por sesión"
    ],
    recommendedModels: RESEARCH_MODELS,
    tools: [
      "search_legal_official",
      "search_legal_academic", 
      "search_general_web",
      "extract_web_content",
      "verify_sources"
    ],
    apiKeys: {
      openrouter: hasOpenRouter ? "✅ Configurada" : "❌ Falta",
      serper: hasSerper ? "✅ Configurada" : "❌ Falta"
    },
    cacheStats: {
      activeAgents: agentCache.size
    }
  })
}

