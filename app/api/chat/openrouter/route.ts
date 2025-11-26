import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { executeConditionalWebSearch, generateSystemMessage } from "@/lib/tools/conditional-web-search"
import { executeDeepLegalSearch } from "@/lib/tools/deep-legal-search"

export const runtime: ServerRuntime = "nodejs"
export const maxDuration = 60 // 60 segundos para Sequential Thinking

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, useSequentialThinking } = json as {
    chatSettings: ChatSettings
    messages: any[]
    useSequentialThinking?: boolean
  }

  try {
    let profile
    try {
      profile = await getServerProfile()
    } catch (error) {
      console.log('⚠️ Usuario no autenticado, usando configuración por defecto')
      profile = {
        email: 'usuario-anonimo',
        openrouter_api_key: process.env.OPENROUTER_API_KEY || ''
      }
    }

    // Usar API key de OpenRouter desde variables de entorno o perfil
    const openrouterApiKey = process.env.OPENROUTER_API_KEY || profile.openrouter_api_key || ""

    if (!openrouterApiKey) {
      throw new Error("OpenRouter API Key no configurada. Por favor configura OPENROUTER_API_KEY en las variables de entorno o en tu perfil.")
    }

    const openai = new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })

    const enhancedMessages = [...messages]
    const lastUserMessage = enhancedMessages.filter(m => m.role === 'user').pop()
    const userQuery = lastUserMessage?.content || ''
    
    const isM1Model = chatSettings.model === "alibaba/tongyi-deepresearch-30b-a3b" || 
                      chatSettings.model === "moonshotai/kimi-k2-thinking"

    let systemMessageContent = ""
    let webSearchContext = ""

    if (isM1Model) {
      console.log(`\n${"⚖️".repeat(60)}`)
      console.log(`🔍 M1/M1 PRO - BÚSQUEDA LEGAL PROFUNDA`)
      console.log(`   Query: "${userQuery.substring(0, 50)}..."`)
      console.log(`   Modelo: ${chatSettings.model}`)
      console.log(`${"⚖️".repeat(60)}\n`)

      // Ejecutar Búsqueda Legal Profunda
      const deepSearchResult = await executeDeepLegalSearch(userQuery)
      
      webSearchContext = deepSearchResult.context
      
      systemMessageContent = `Eres un asistente legal experto en derecho colombiano.

🔍 CONTEXTO DE INVESTIGACIÓN LEGAL PROFUNDA:
${webSearchContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TU OBJETIVO:
Proporcionar una respuesta jurídica precisa, fundamentada y profesional basada EXCLUSIVAMENTE en el contexto proporcionado arriba y en tu conocimiento general del derecho colombiano.

REGLAS ESTRICTAS DE RESPUESTA:
1. **JERARQUÍA NORMATIVA**: Respeta siempre la pirámide de Kelsen aplicada a Colombia (Constitución > Ley > Decreto > Resolución).
2. **CITACIÓN OBLIGATORIA**: Debes citar la fuente exacta (ej: "Según la Sentencia C-123 de 2024...") para cada afirmación legal. Si la información proviene del contexto de búsqueda, úsalo.
3. **NO ALUCINAR**: Si no encuentras una norma específica en el contexto o tu base de conocimiento es difusa, ADMÍTELO. No inventes artículos ni sentencias.
4. **VOCABULARIO TÉCNICO**: Usa terminología jurídica colombiana correcta (ej: "Tutela", "Derecho de Petición", "Exequibilidad", "Nulidad").
5. **ESTRUCTURA**:
   - **Resumen Ejecutivo**: Respuesta directa en 1 párrafo.
   - **Fundamento Jurídico**: Análisis detallado con citas.
   - **Jurisprudencia Relacionada**: Menciona fallos relevantes si los hay en el contexto.
   - **Conclusión/Recomendación**: Pasos prácticos para el usuario.

SI EL MODELO ES "THINKING" (M1 PRO):
- Usa tu capacidad de razonamiento para conectar los puntos entre las diferentes fuentes antes de responder.
- Evalúa la vigencia de las normas (¿está derogada?, ¿fue declarada inexequible?).`

    } else {
      // Lógica legacy para otros modelos
      console.log(`\n${"🧠".repeat(60)}`)
      console.log(`🔍 OPENROUTER - BÚSQUEDA WEB ESTÁNDAR`)
      console.log(`   Query: "${userQuery.substring(0, 50)}..."`)
      console.log(`${"🧠".repeat(60)}\n`)
      
      const searchResult = await executeConditionalWebSearch(userQuery, {
        logDetection: true
      })
      
      systemMessageContent = generateSystemMessage(userQuery, searchResult)
      webSearchContext = searchResult.webSearchContext
    }
    
    // Generar mensaje de sistema apropiado
    const systemMessage = {
      role: "system",
      content: systemMessageContent
    }

    // Insertar el mensaje de sistema al inicio si no hay uno
    if (enhancedMessages.length === 0 || enhancedMessages[0].role !== "system") {
      enhancedMessages.unshift(systemMessage)
    } else {
      // Si ya hay un mensaje de sistema, reemplazarlo o actualizarlo
      enhancedMessages[0].content = systemMessageContent
    }

    console.log(`⚖️ Contexto inyectado: ${webSearchContext.split('\n').length} líneas.`)

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: enhancedMessages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens: undefined,
      stream: true,
      extra_body: {
        include_reasoning: true
      }
    })

    const stream = OpenAIStream(response)

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenRouter API Key not found. Please set it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
