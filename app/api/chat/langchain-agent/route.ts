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
import { createClient } from '@supabase/supabase-js'
import { canContinueChat, getUserPlanStatus } from '@/lib/billing/plan-access'
import { incrementTokenUsage } from '@/db/usage-tracking'

// Supabase client for auth and billing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    return cached.agent
  }
  const agent = await LegalAgent.create({
    modelId,
    temperature,
    maxIterations: 10, // Aumentado para consultas legales complejas
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

  try {
    const body = await request.json() as RequestBody
    const { chatSettings, messages, chatId, userId } = body

    // ═══════════════════════════════════════════════════════════════════════
    // BILLING CHECK: Verify user can continue chatting
    // ═══════════════════════════════════════════════════════════════════════
    let effectiveUserId = userId
    
    // If no userId provided, try to get from auth header
    if (!effectiveUserId) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data: { user } } = await supabase.auth.getUser(token)
        effectiveUserId = user?.id
      }
    }

    // Check if billing is enabled and user has access
    if (process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true' && effectiveUserId) {
      const canChat = await canContinueChat(effectiveUserId)
      
      if (!canChat.allowed) {
        return NextResponse.json(
          { 
            error: canChat.reason || "Has alcanzado el límite de tu plan",
            code: "USAGE_LIMIT_EXCEEDED",
            needsUpgrade: true
          },
          { status: 402 } // Payment Required
        )
      }
    }

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

    // Extraer el último mensaje del usuario
    const userMessages = messages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''

    // Obtener o crear agente
    const effectiveChatId = chatId || `temp-${Date.now()}`
    const agent = await getOrCreateAgent(effectiveChatId, modelId, temperature)

    // Convertir historial (excluyendo el último mensaje del usuario)
    const chatHistory = convertMessages(messages.slice(0, -1))

    // Crear stream de respuesta con eventos JSON
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        
        // Helper para emitir eventos de forma segura
        const emit = (event: object) => {
          if (isClosed) return
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          } catch (e) {
            // Ignorar errores si el controller ya está cerrado
          }
        }
        
        const safeClose = () => {
          if (isClosed) return
          isClosed = true
          try {
            controller.close()
          } catch (e) {
            // Ignorar errores si ya está cerrado
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

          // ═══════════════════════════════════════════════════════════════════
          // TOKEN TRACKING: Track usage for billing
          // ═══════════════════════════════════════════════════════════════════
          if (effectiveUserId && process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true') {
            // Estimate token usage (rough approximation)
            // Output tokens: approximately 1 token per 4 characters
            const outputTokens = Math.ceil(cleanOutput.length / 4)
            // Input tokens: sum of all message characters
            const inputTokens = Math.ceil(
              messages.reduce((acc, m) => acc + m.content.length, 0) / 4
            )
            
            try {
              await incrementTokenUsage(effectiveUserId, outputTokens, inputTokens)
              console.log(`📊 Token usage tracked: output=${outputTokens}, input=${inputTokens}`)
            } catch (trackingError) {
              console.error('Error tracking token usage:', trackingError)
              // Don't fail the request for tracking errors
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
          
          safeClose()

        } catch (error: any) {
          
          // Mensaje específico para error de max iterations
          let errorMessage = 'Hubo un error procesando tu consulta. Por favor, intenta de nuevo.'
          
          if (error.message?.includes('max iterations') || error.message?.includes('Agent stopped')) {
            errorMessage = 'La consulta requiere más investigación de la que puedo completar en este momento. ' +
                          'Te recomiendo dividir tu pregunta en consultas más específicas.'
            // Emitir como respuesta parcial, no como error
            emit({ type: 'token', content: errorMessage })
            emit({ type: 'done', metadata: { partial: true } })
          } else {
            emit({ type: 'error', message: errorMessage })
          }
          
          safeClose()
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




