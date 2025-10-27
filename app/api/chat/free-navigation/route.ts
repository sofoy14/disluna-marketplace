import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { runUnlimitedSearchWorkflow } from "@/lib/tools/unlimited-search-orchestrator"
import { ChatMemoryManager } from "@/lib/memory/chat-memory-manager"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const DEFAULT_MAX_TOKENS = 4000
const DEFAULT_TEMPERATURE = 0.3

interface RequestBody {
  chatSettings: ChatSettings
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
  chatId?: string
  userId?: string
}

export async function POST(request: Request) {
  const { chatSettings, messages, chatId, userId } = (await request.json()) as RequestBody

  try {
    const apiKey = process.env.OPENROUTER_API_KEY || ""

    if (!apiKey) {
      throw new Error(
        "OpenRouter API Key no configurada. Define OPENROUTER_API_KEY."
      )
    }

    const client = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
    })

    const userQuery = extractLastUserMessage(messages)
    const modelName = chatSettings.model as string
    
    // Generar IDs únicos para el chat si no se proporcionan
    const finalChatId = chatId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const finalUserId = userId || "usuario-anonimo"

    console.log(`\n🌐 NAVEGACIÓN LIBRE EN LA WEB INICIADA`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`💬 Chat ID: ${finalChatId}`)
    console.log(`👤 User ID: ${finalUserId}`)
    console.log(`🤖 Modelo: ${modelName}`)
    console.log(`${'='.repeat(80)}`)

    // Inicializar sistema de memoria
    const memoryManager = ChatMemoryManager.getInstance()
    const chatContext = await memoryManager.getChatContext(finalChatId, finalUserId)
    
    // Obtener historial relevante
    const relevantHistory = await memoryManager.getRelevantHistory(
      finalChatId, 
      finalUserId, 
      userQuery, 
      10
    )

    console.log(`🧠 Memoria cargada: ${relevantHistory.length} mensajes relevantes`)
    console.log(`📊 Contexto actual: ${chatContext.currentContext.length} caracteres`)

    // Detectar si la consulta requiere búsqueda web
    const requiresSearch = detectSearchRequirement(userQuery)
    
    let systemContent = `Eres un asistente legal experto en derecho colombiano con acceso completo a la web. Responde de manera completa y precisa usando terminología jurídica apropiada.`
    
    // Agregar contexto de memoria si existe
    if (relevantHistory.length > 0) {
      const memoryContext = buildMemoryContext(relevantHistory)
      systemContent += `\n\nCONTEXTO DE CONVERSACIÓN ANTERIOR:\n${memoryContext}`
    }
    
    if (requiresSearch) {
      console.log(`🔍 Consulta requiere búsqueda web - Ejecutando navegación libre`)
      
      try {
        // Usar sistema de búsqueda completamente libre
        const compatibleModel = modelName.includes('tongyi') ? 'alibaba/tongyi-deepresearch-30b-a3b' : modelName
        const searchResult = await runUnlimitedSearchWorkflow(userQuery, {
          client,
          model: compatibleModel,
          searchTimeoutMs: 30000,
          maxResultsPerSearch: 10,
          enableContentExtraction: true
        })

        console.log(`✅ Navegación libre completada:`)
        console.log(`   🔍 Búsquedas: ${searchResult.totalSearches}`)
        console.log(`   📄 Resultados: ${searchResult.totalResults}`)
        console.log(`   ⏱️ Duración: ${(searchResult.totalDurationMs / 1000).toFixed(1)}s`)

        // Guardar información de búsqueda en memoria
        await memoryManager.recordSearch(
          finalChatId,
          finalUserId,
          userQuery,
          searchResult.allResults,
          searchResult.totalSearches,
          searchResult.totalDurationMs
        )

        systemContent = `Eres un asistente legal experto en derecho colombiano con acceso completo a la web. Utiliza EXCLUSIVAMENTE la información proporcionada para responder la consulta del usuario.

${searchResult.finalContext}

INSTRUCCIONES:
1. Responde de manera completa y precisa
2. Usa terminología jurídica apropiada
3. Incluye referencias a artículos y leyes cuando sea relevante
4. Proporciona información práctica y aplicable
5. Si hay información insuficiente, indícalo claramente
6. Responde en español colombiano
7. Considera el contexto de conversación anterior si es relevante`

      } catch (searchError) {
        console.error(`❌ Error en navegación libre:`, searchError)
        systemContent = `Eres un asistente legal experto en derecho colombiano. Responde de manera completa y precisa usando terminología jurídica apropiada.`
      }
    } else {
      console.log(`💬 Consulta simple - Respondiendo directamente`)
    }
    
    // Guardar mensaje del usuario en memoria
    const userMessageId = `user-${Date.now()}`
    await memoryManager.saveMessage(
      finalChatId,
      finalUserId,
      userMessageId,
      userQuery,
      'user'
    )
    
    // Agregar mensaje de sistema
    const systemMessage = {
      role: "system" as const,
      content: systemContent
    }
    
    const messagesWithSystem = [systemMessage, ...messages]

    // Generar respuesta streaming con modelo compatible
    const finalModel = modelName.includes('tongyi') ? 'alibaba/tongyi-deepresearch-30b-a3b' : chatSettings.model
    const response = await client.chat.completions.create({
      model: finalModel as ChatCompletionCreateParamsBase["model"],
      messages: messagesWithSystem,
      temperature:
        typeof chatSettings.temperature === "number"
          ? chatSettings.temperature
          : DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS,
      stream: true,
    })

    // Crear stream personalizado para capturar la respuesta completa
    let fullResponse = ""
    const stream = OpenAIStream(response, {
      onToken: (token) => {
        fullResponse += token
      },
      onFinish: async () => {
        // Guardar respuesta del asistente en memoria
        const assistantMessageId = `assistant-${Date.now()}`
        await memoryManager.saveMessage(
          finalChatId,
          finalUserId,
          assistantMessageId,
          fullResponse,
          'assistant',
          {
            searchRounds: requiresSearch ? 1 : 0,
            totalSearches: requiresSearch ? 1 : 0,
            totalResults: requiresSearch ? 1 : 0,
            finalQuality: 8,
            modelDecisions: 0,
            searchStrategy: requiresSearch ? "NAVEGACION_LIBRE" : "RESPUESTA_DIRECTA"
          }
        )
        
        console.log(`💾 Respuesta guardada en memoria: ${fullResponse.length} caracteres`)
      }
    })

    return new StreamingTextResponse(stream)

  } catch (error: any) {
    console.error("[free-navigation-route] Error:", error)
    const message =
      error?.error?.message ||
      error?.message ||
      "Error en el asistente legal con navegación libre"

    const status = typeof error?.status === "number" ? error.status : 500

    return new Response(
      JSON.stringify({
        message,
        error: "FREE_NAVIGATION_ERROR",
      }),
      { status }
    )
  }
}

export const runtime = "edge"

function extractLastUserMessage(messages: RequestBody["messages"]): string {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
  return typeof lastUserMessage?.content === "string"
    ? lastUserMessage.content
    : ""
}

function detectSearchRequirement(query: string): boolean {
  const searchKeywords = [
    'requisitos', 'constituir', 'sociedad', 'SAS', 'SRL', 'SA',
    'jurisprudencia', 'corte', 'constitucional', 'consejo', 'estado',
    'código', 'ley', 'decreto', 'artículo', 'norma', 'legislación',
    'reforma', 'modificación', 'vigencia', 'derogación',
    'proceso', 'trámite', 'procedimiento', 'requisito',
    'documento', 'certificado', 'registro', 'matrícula',
    'colombia', 'colombiano', 'derecho', 'legal', 'jurídico',
    'contrato', 'obligación', 'responsabilidad', 'daño',
    'penal', 'civil', 'comercial', 'laboral', 'administrativo',
    'tributario', 'fiscal', 'impuesto', 'DIAN', 'superintendencia',
    'ministerio', 'gobierno', 'estado', 'municipio', 'departamento',
    'buscar', 'investigar', 'encontrar', 'información', 'datos',
    'actualizado', 'reciente', 'nuevo', 'último', 'vigente'
  ]
  
  const lowerQuery = query.toLowerCase()
  
  // Ser más agresivo: si contiene cualquier palabra legal, buscar
  const hasLegalKeyword = searchKeywords.some(keyword => lowerQuery.includes(keyword))
  
  // También buscar si la consulta es larga (probablemente compleja)
  const isComplexQuery = query.length > 30
  
  // Buscar si contiene signos de interrogación múltiples o puntos
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 0
  
  // Buscar si menciona "buscar", "investigar", etc.
  const hasSearchIntent = lowerQuery.includes('buscar') || 
                         lowerQuery.includes('investigar') || 
                         lowerQuery.includes('encontrar') ||
                         lowerQuery.includes('información')
  
  return hasLegalKeyword || isComplexQuery || hasMultipleQuestions || hasSearchIntent
}

function buildMemoryContext(history: any[]): string {
  if (history.length === 0) return ""
  
  const contextMessages = history.slice(-5).map(msg => {
    const role = msg.role === 'user' ? 'Usuario' : 'Asistente'
    const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content
    return `${role}: ${content}`
  }).join('\n\n')
  
  return `CONVERSACIÓN ANTERIOR:\n${contextMessages}\n\nUsa este contexto para mantener coherencia en la conversación.`
}












