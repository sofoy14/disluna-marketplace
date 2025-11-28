/**
 * Endpoint Unificado del Agente Legal con LangChain
 * 
 * Este endpoint usa LangChain para implementar un agente con tool calling nativo.
 * 
 * Características:
 * - Soporta múltiples modelos (Kimi K2, Tongyi, GPT-4o, Claude)
 * - Tool calling nativo (el modelo decide cuándo usar herramientas)
 * - Streaming REAL de respuestas y razonamiento
 * - Manejo de historial de conversación
 * 
 * Modelos recomendados:
 * - moonshotai/kimi-k2-thinking: Razonamiento profundo (M1 Pro)
 * - alibaba/tongyi-deepresearch-30b-a3b: Investigación profunda (M1)
 * 
 * Formato de streaming (JSON Lines):
 * - {"type": "thinking", "content": "..."} - Proceso de razonamiento
 * - {"type": "tool_start", "tool": "...", "input": "..."} - Inicio de herramienta
 * - {"type": "tool_end", "tool": "...", "output": "..."} - Fin de herramienta  
 * - {"type": "token", "content": "..."} - Token de respuesta
 * - {"type": "sources", "sources": [...]} - Fuentes encontradas
 * - {"type": "done"} - Fin del stream
 */

import { NextRequest, NextResponse } from "next/server"
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages"
import { LegalAgent, getModelConfig, RESEARCH_MODELS } from "@/lib/langchain"
import { BaseCallbackHandler } from "@langchain/core/callbacks/base"

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
// STREAMING CALLBACK HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Callback handler que emite eventos de streaming
 */
class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "streaming_handler"
  private encoder: TextEncoder
  private controller: ReadableStreamDefaultController<Uint8Array>

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    super()
    this.encoder = new TextEncoder()
    this.controller = controller
  }

  private emit(event: object) {
    try {
      const data = JSON.stringify(event) + '\n'
      this.controller.enqueue(this.encoder.encode(data))
    } catch (e) {
      console.error('Error emitting event:', e)
    }
  }

  // Cuando el LLM empieza a generar
  async handleLLMStart(llm: any, prompts: string[]) {
    this.emit({ type: 'thinking', content: '🧠 Analizando la consulta...' })
  }

  // Cuando recibimos tokens del LLM (razonamiento/respuesta)
  async handleLLMNewToken(token: string) {
    // Detectar si es parte del razonamiento (thinking) o respuesta final
    // Los modelos thinking suelen incluir tags especiales
    if (token.includes('<think>') || token.includes('</think>')) {
      // No emitir los tags, solo el contenido
      return
    }
    
    this.emit({ type: 'token', content: token })
  }

  // Cuando el LLM termina
  async handleLLMEnd(output: any) {
    // Si hay reasoning/thinking en el output, emitirlo
    const reasoning = output?.generations?.[0]?.[0]?.message?.additional_kwargs?.reasoning
    if (reasoning) {
      this.emit({ type: 'thinking', content: reasoning })
    }
  }

  // Cuando se inicia una herramienta
  async handleToolStart(tool: any, input: string) {
    const toolName = tool?.name || 'herramienta'
    this.emit({ 
      type: 'tool_start', 
      tool: toolName, 
      input: input.substring(0, 100) + (input.length > 100 ? '...' : '')
    })
  }

  // Cuando termina una herramienta
  async handleToolEnd(output: string) {
    // Resumir el output si es muy largo
    const summary = output.length > 200 
      ? output.substring(0, 200) + '... (ver fuentes abajo)'
      : output
    this.emit({ type: 'tool_end', output: summary })
  }

  // Cuando hay un error en una herramienta
  async handleToolError(err: Error) {
    this.emit({ type: 'tool_error', error: err.message })
  }

  // Cuando el agente toma una acción
  async handleAgentAction(action: any) {
    this.emit({ 
      type: 'thinking', 
      content: `📋 Decidí usar: ${action.tool} para "${action.toolInput?.query || action.toolInput?.url || '...'}"` 
    })
  }

  // Cuando el agente termina
  async handleAgentEnd(output: any) {
    this.emit({ type: 'agent_done' })
  }
}

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
    // EJECUTAR AGENTE CON STREAMING REAL
    // ═══════════════════════════════════════════════════════════════════════════

    console.log(`🚀 Ejecutando agente con streaming real...`)

    // Crear stream de respuesta con eventos JSON
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        // Helper para emitir eventos
        const emit = (event: object) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          } catch (e) {
            console.error('Error emitting:', e)
          }
        }

        try {
          // Emitir evento de inicio
          emit({ type: 'thinking', content: '🧠 Analizando tu consulta legal...' })

          // Ejecutar el agente
          const result = await agent.invoke({
            input: lastUserMessage,
            chatHistory
          })

          // Emitir información sobre herramientas usadas
          if (result.toolsUsed && result.toolsUsed.length > 0) {
            emit({ 
              type: 'thinking', 
              content: `🔧 Herramientas utilizadas: ${result.toolsUsed.join(', ')}` 
            })
          }

          // Emitir pasos intermedios como razonamiento
          if (result.intermediateSteps && result.intermediateSteps.length > 0) {
            for (const step of result.intermediateSteps) {
              if (step.action?.tool) {
                emit({ 
                  type: 'tool_start', 
                  tool: step.action.tool,
                  input: typeof step.action.toolInput === 'string' 
                    ? step.action.toolInput.substring(0, 100)
                    : JSON.stringify(step.action.toolInput).substring(0, 100)
                })
              }
              if (step.observation) {
                const obsPreview = typeof step.observation === 'string'
                  ? step.observation.substring(0, 150)
                  : 'Resultados obtenidos'
                emit({ type: 'tool_end', output: obsPreview + '...' })
              }
            }
          }

          // Emitir fin del razonamiento
          emit({ type: 'thinking_done' })

          // Limpiar la respuesta del modelo
          let cleanOutput = result.output
          
          // Limpieza de formato
          cleanOutput = cleanOutput
            .replace(/\*{0,2}Fuentes consultadas\*{0,2}\s*\n+/gi, '')
            .replace(/\d+\s*referencias?\s*\n+/gi, '')
            .replace(/\n+---\n*\*{0,2}Fuentes?\s*(consultadas|legales?)?\*{0,2}:?\s*\n*$/gi, '')
            .replace(/\n+\*{0,2}Fuentes?\s*(consultadas|legales?)?\*{0,2}:?\s*\n*$/gi, '')
            .replace(/\n*\*{0,2}(Advertencia|Nota importante|Importante|Disclaimer):?\*{0,2}[^]*?(consultar?|abogado|profesional|asesor)[^]*?\.?\n*/gi, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
          
          // Emitir respuesta token por token (streaming real)
          const words = cleanOutput.split(' ')
          
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '')
            emit({ type: 'token', content: word })
            
            // Pequeña pausa para efecto de streaming visual
            await new Promise(resolve => setTimeout(resolve, 15))
          }

          // Emitir fuentes si existen
          if (result.sources && result.sources.length > 0) {
            const validSources = result.sources.filter(s => 
              s.url && s.url.startsWith('http') && s.url.length > 10
            )
            
            const uniqueSources = validSources.filter((s, i, arr) => 
              arr.findIndex(x => x.url === s.url) === i
            )
            
            if (uniqueSources.length > 0) {
              emit({ type: 'sources', sources: uniqueSources })
              
              // También emitir como texto para compatibilidad
              const sourcesSection = `\n\n---\n\n📚 **Fuentes consultadas:**\n\n${
                uniqueSources.map((s, i) => {
                  let title = s.title || 'Fuente legal'
                  try {
                    const url = new URL(s.url)
                    const hostname = url.hostname.replace('www.', '')
                    const knownDomains: Record<string, string> = {
                      'secretariasenado.gov.co': 'Secretaría del Senado',
                      'corteconstitucional.gov.co': 'Corte Constitucional',
                      'consejodeestado.gov.co': 'Consejo de Estado',
                      'suin-juriscol.gov.co': 'SUIN-Juriscol',
                    }
                    if (!title || title === s.url || title.length < 3) {
                      title = knownDomains[hostname] || hostname
                    }
                  } catch {}
                  return `${i + 1}. [${title}](${s.url})`
                }).join('\n')
              }`
              emit({ type: 'token', content: sourcesSection })
            }
          }

          // Emitir evento de finalización
          const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
          emit({ 
            type: 'done',
            metadata: {
              model: modelId,
              processingTime: processingTime + 's',
              toolsUsed: result.toolsUsed || [],
              sourcesCount: result.sources?.length || 0
            }
          })
          
          controller.close()

          console.log(`\n${'═'.repeat(60)}`)
          console.log(`✅ RESPUESTA COMPLETADA (Streaming real)`)
          console.log(`   ⏱️ Tiempo: ${processingTime}s`)
          console.log(`   🔧 Tools: ${result.toolsUsed?.join(', ') || 'Ninguna'}`)
          console.log(`   📚 Fuentes: ${result.sources?.length || 0}`)
          console.log(`${'═'.repeat(60)}\n`)

        } catch (error) {
          console.error('❌ Error en streaming:', error)
          emit({ type: 'error', message: 'Hubo un error procesando tu consulta. Por favor, intenta de nuevo.' })
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Model-Used': modelId,
        'X-Streaming': 'true',
        'Cache-Control': 'no-cache'
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



