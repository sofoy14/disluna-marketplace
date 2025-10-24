import { ChatSettings } from "@/types"
import { NextRequest, NextResponse } from "next/server"
import { createTongyiUnifiedLegalAgent } from "@/lib/agents/tongyi-unified-legal-agent"
import { ChatMemoryManager } from "@/lib/memory/chat-memory-manager"

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

    const userQuery = extractLastUserMessage(messages)
    const modelName = chatSettings.model as string
    
    // Generar IDs únicos para el chat si no se proporcionan
    const finalChatId = chatId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const finalUserId = userId || "usuario-anonimo"

    console.log(`\n🧠 TONGYI REACT AGENT - SISTEMA COMPLETO`)
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
    
    let responseContent = ""

    if (requiresSearch) {
      console.log(`🔍 Consulta requiere búsqueda web - Ejecutando Agente Unificado`)
      
      try {
        // Usar agente Tongyi Unificado con paradigmas oficiales de DeepResearch
        const unifiedAgent = createTongyiUnifiedLegalAgent(apiKey, {
          maxRounds: 8,
          enableContinuousVerification: true,
          enableIterativeRefinement: true,
          enableMemory: true,
          enableAntiHallucination: true,
          preferredSources: ['official', 'academic', 'news'],
          qualityThreshold: 0.85
        })
        
        const unifiedResponse = await unifiedAgent.processLegalQuery(
          userQuery,
          finalChatId,
          finalUserId
        )

        console.log(`✅ Agente Unificado completado:`)
        console.log(`   🎯 Modo de investigación: ${unifiedResponse.analysis.researchMode}`)
        console.log(`   🔍 Rondas ejecutadas: ${unifiedResponse.metadata.totalRounds}`)
        console.log(`   📄 Fuentes encontradas: ${unifiedResponse.metadata.totalSources}`)
        console.log(`   🛡️ Verificación: ${unifiedResponse.analysis.verificationPassed ? '✅' : '❌'}`)
        console.log(`   🎯 Confianza: ${unifiedResponse.analysis.confidence.toFixed(2)}`)
        console.log(`   ⏱️ Tiempo: ${(unifiedResponse.analysis.processingTime / 1000).toFixed(1)}s`)

                // Usar directamente la respuesta del modelo sin agregar información adicional
                responseContent = unifiedResponse.finalAnswer

      } catch (searchError) {
        console.error(`❌ Error en agente unificado:`, searchError)
        
        // Fallback a respuesta simple
        console.log(`🔄 Fallback a respuesta directa`)
        responseContent = `Disculpe, hubo un error procesando su consulta con el sistema de análisis avanzado. Por favor, intente reformular su pregunta de manera más específica.`
      }
    } else {
      console.log(`💬 Consulta simple - Respondiendo directamente`)
      responseContent = `Esta consulta no requiere búsqueda web específica. Por favor, proporcione más detalles sobre su consulta legal para obtener una respuesta más completa.`
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

    // Crear stream personalizado para la respuesta del agente unificado
    const stream = new ReadableStream({
      start(controller) {
        const chunks = responseContent.split(' ')
        let index = 0
        
        const pushChunk = () => {
          if (index < chunks.length) {
            const chunk = chunks[index] + (index < chunks.length - 1 ? ' ' : '')
            controller.enqueue(new TextEncoder().encode(chunk))
            index++
            setTimeout(pushChunk, 30) // Simular streaming más rápido
          } else {
            controller.close()
          }
        }
        
        pushChunk()
      }
    })

    // Guardar respuesta del asistente en memoria
    const assistantMessageId = `assistant-${Date.now()}`
    await memoryManager.saveMessage(
      finalChatId,
      finalUserId,
      assistantMessageId,
      responseContent,
      'assistant',
      {
        searchRounds: requiresSearch ? 8 : 0,
        totalSearches: requiresSearch ? 1 : 0,
        totalResults: requiresSearch ? 1 : 0,
        finalQuality: 9,
        modelDecisions: requiresSearch ? 1 : 0,
        searchStrategy: requiresSearch ? "AGENTE_UNIFICADO_TONGYI" : "RESPUESTA_DIRECTA"
      }
    )
    
    console.log(`💾 Respuesta del agente unificado guardada en memoria: ${responseContent.length} caracteres`)
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })

  } catch (error: any) {
    console.error("[legal-route] Error:", error)
    const message =
      error?.error?.message ||
      error?.message ||
      "Error en el asistente legal colombiano"

    const status = typeof error?.status === "number" ? error.status : 500

    return new Response(
      JSON.stringify({
        message,
        error: "ASISTENTE_LEGAL_ERROR",
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
    'valor financiero', 'cuentas', 'participación', 'financiero',
    'bancario', 'crédito', 'préstamo', 'inversión', 'capital'
  ]
  
  const lowerQuery = query.toLowerCase()
  
  // Ser más agresivo: si contiene cualquier palabra legal, buscar
  const hasLegalKeyword = searchKeywords.some(keyword => lowerQuery.includes(keyword))
  
  // También buscar si la consulta es larga (probablemente compleja)
  const isComplexQuery = query.length > 30
  
  // Buscar si contiene signos de interrogación múltiples o puntos
  const hasMultipleQuestions = (query.match(/\?/g) || []).length > 0
  
  return hasLegalKeyword || isComplexQuery || hasMultipleQuestions
}