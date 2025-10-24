import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { LegalAIAgent } from "@/lib/agents/legal-ai-agent"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const FALLBACK_USERNAME = "usuario-anonimo"
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
    const profile = await getServerProfile()
    const apiKey =
      process.env.OPENROUTER_API_KEY || profile.openrouter_api_key || ""

    if (!apiKey) {
      throw new Error(
        "OpenRouter API Key no configurada. Define OPENROUTER_API_KEY o agrega la clave en el perfil del usuario."
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
    const finalUserId = userId || profile.username || FALLBACK_USERNAME

    console.log(`\n🤖 AI AGENT LEGAL INICIADO`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`💬 Chat ID: ${finalChatId}`)
    console.log(`👤 User ID: ${finalUserId}`)
    console.log(`🤖 Modelo: ${modelName}`)
    console.log(`${'='.repeat(80)}`)

    // Crear AI Agent con capacidades agenticas
    const aiAgent = new LegalAIAgent({
      client,
      model: modelName,
      chatId: finalChatId,
      userId: finalUserId,
      enableMemory: true,
      enableAgenticSearch: true,
      maxSearchRounds: 10,
      searchTimeoutMs: 45000
    })

    // Procesar consulta con el AI Agent
    const agentResponse = await aiAgent.processQuery(userQuery, `msg-${Date.now()}`)

    console.log(`✅ AI Agent completado:`)
    console.log(`   🎯 Acción: ${agentResponse.action}`)
    console.log(`   🔍 Búsqueda ejecutada: ${agentResponse.metadata.searchExecuted ? 'SÍ' : 'NO'}`)
    if (agentResponse.metadata.searchExecuted) {
      console.log(`   📊 Rondas: ${agentResponse.metadata.searchRounds}`)
      console.log(`   🔍 Búsquedas: ${agentResponse.metadata.totalSearches}`)
      console.log(`   📄 Resultados: ${agentResponse.metadata.totalResults}`)
      console.log(`   🎯 Calidad: ${agentResponse.metadata.finalQuality}/10`)
    }

    // Crear mensaje de sistema con el contexto del agente
    const systemContent = `Eres un asistente legal experto en derecho colombiano. Utiliza EXCLUSIVAMENTE la información proporcionada para responder la consulta del usuario.

${agentResponse.content}

INSTRUCCIONES:
1. Responde de manera completa y precisa
2. Usa terminología jurídica apropiada
3. Incluye referencias a artículos y leyes cuando sea relevante
4. Proporciona información práctica y aplicable
5. Si hay información insuficiente, indícalo claramente
6. Responde en español colombiano`

    // Agregar mensaje de sistema
    const systemMessage = {
      role: "system" as const,
      content: systemContent
    }
    
    const messagesWithSystem = [systemMessage, ...messages]

    // Generar respuesta streaming
    const response = await client.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messagesWithSystem,
      temperature:
        typeof chatSettings.temperature === "number"
          ? chatSettings.temperature
          : DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS,
      stream: true,
    })

    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)

  } catch (error: any) {
    console.error("[ai-agent-route] Error:", error)
    const message =
      error?.error?.message ||
      error?.message ||
      "Error en el asistente legal con capacidades agenticas"

    const status = typeof error?.status === "number" ? error.status : 500

    return new Response(
      JSON.stringify({
        message,
        error: "AI_AGENT_ERROR",
      }),
      { status }
    )
  }
}

export const runtime = "edge"

function extractLastUserMessage(messages: Array<{ role: string; content: string }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content
    }
  }
  return ""
}








