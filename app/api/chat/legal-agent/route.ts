/**
 * Endpoint Unificado del Agente Legal con Tool Calling
 * 
 * Este endpoint implementa el ciclo completo de tool calling:
 * 1. Envía mensaje al modelo con definiciones de tools
 * 2. Detecta si el modelo solicita tool_calls
 * 3. Ejecuta las tools en el backend
 * 4. Envía resultados de vuelta al modelo
 * 5. Obtiene respuesta final
 */

import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { 
  LEGAL_TOOLS_DEFINITIONS, 
  executeTool 
} from "@/lib/tools/legal/tongyi-legal-toolkit"

export const runtime = "nodejs"
export const maxDuration = 120 // 2 minutos para investigación completa

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

interface ToolCallResult {
  tool_call_id: string
  role: "tool"
  name: string
  content: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT DEL SISTEMA
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_AGENT_SYSTEM_PROMPT = `Eres un Agente de Investigación Legal Colombiano EXPERTO con capacidad de buscar información actualizada en internet.

## REGLAS ABSOLUTAS SOBRE USO DE HERRAMIENTAS

1. **SIEMPRE** usa la herramienta \`search_legal_official\` para consultas sobre:
   - Leyes, decretos, resoluciones colombianas
   - Artículos de códigos (Civil, Penal, Comercial, etc.)
   - Jurisprudencia (sentencias de Corte Constitucional, Consejo de Estado, CSJ)
   - Procedimientos legales
   - Derechos constitucionales
   - Regulaciones de superintendencias

2. **USA las herramientas ANTES de responder**. No respondas solo con tu conocimiento base.

3. **Estrategia de búsqueda recomendada:**
   - Primera búsqueda: \`search_legal_official\` con términos específicos
   - Si necesitas más contexto: \`search_legal_academic\` para doctrina
   - Si falta información: \`search_general_web\` como último recurso

## PROHIBICIONES ABSOLUTAS

- ❌ NUNCA inventes números de artículos, leyes o sentencias
- ❌ NUNCA afirmes información legal sin haberla buscado primero
- ❌ NUNCA cites fuentes que no hayas encontrado en la búsqueda
- ❌ NUNCA respondas "según la información encontrada" sin especificar la fuente

## FORMATO DE RESPUESTA

1. **Respuesta Directa**: Responde la pregunta del usuario claramente
2. **Fundamento Legal**: Cita las normas/sentencias encontradas (solo las que aparecen en la búsqueda)
3. **Fuentes**: Lista las URLs de donde proviene la información

## JERARQUÍA NORMATIVA COLOMBIANA

1. Constitución Política de 1991 + Bloque de Constitucionalidad
2. Leyes Estatutarias > Orgánicas > Ordinarias
3. Decretos Legislativos > Reglamentarios
4. Jurisprudencia (Corte Constitucional > CSJ/Consejo de Estado)

## INSTRUCCIÓN FINAL

Cuando recibas una consulta legal, tu PRIMER paso debe ser llamar a \`search_legal_official\` para obtener información actualizada. Responde en español colombiano con terminología jurídica precisa.`

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrae el último mensaje del usuario
 */
function extractLastUserMessage(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter(m => m.role === 'user')
  return userMessages[userMessages.length - 1]?.content || ""
}

/**
 * Detecta si la consulta requiere búsqueda legal
 */
function requiresLegalSearch(query: string): boolean {
  const legalKeywords = [
    'ley', 'decreto', 'artículo', 'código', 'sentencia', 'jurisprudencia',
    'constitución', 'constitucional', 'tutela', 'demanda', 'proceso',
    'prescripción', 'caducidad', 'derecho', 'legal', 'norma', 'legislación',
    'tribunal', 'corte', 'juez', 'fiscal', 'penal', 'civil', 'comercial',
    'laboral', 'administrativo', 'tributario', 'contrato', 'obligación',
    'responsabilidad', 'indemnización', 'daño', 'perjuicio', 'colombia',
    'colombiano', 'ministerio', 'superintendencia', 'dian', 'requisitos',
    'procedimiento', 'trámite', 'cómo', 'qué', 'cuándo', 'cuáles'
  ]
  
  const queryLower = query.toLowerCase()
  return legalKeywords.some(keyword => queryLower.includes(keyword))
}

/**
 * Procesa los tool_calls del modelo y ejecuta las herramientas
 */
async function processToolCalls(
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = []
  
  for (const toolCall of toolCalls) {
    const { id, function: { name, arguments: argsString } } = toolCall
    
    console.log(`🔧 Procesando tool call: ${name}`)
    console.log(`📝 Argumentos: ${argsString}`)
    
    try {
      // Parsear argumentos
      const args = JSON.parse(argsString)
      
      // Ejecutar la tool
      const toolResult = await executeTool(name, args)
      
      // Formatear resultado para el modelo
      let formattedResult: string
      
      if (Array.isArray(toolResult)) {
        // Es un array de resultados de búsqueda
        if (toolResult.length === 0) {
          formattedResult = `No se encontraron resultados para la búsqueda "${args.query}". Intenta con otros términos.`
        } else {
          formattedResult = `🔍 **Resultados de búsqueda para: "${args.query}"**\n\n` +
            toolResult.map((r: any, i: number) => 
              `${i + 1}. **${r.title}**\n` +
              `   📎 URL: ${r.url}\n` +
              `   📄 Tipo: ${r.type === 'official' ? '🏛️ OFICIAL' : r.type === 'academic' ? '📚 ACADÉMICO' : '🌐 GENERAL'}\n` +
              `   📝 Contenido: ${(r.content || r.snippet || '').substring(0, 500)}...\n`
            ).join('\n')
        }
      } else if (typeof toolResult === 'object') {
        formattedResult = JSON.stringify(toolResult, null, 2)
      } else {
        formattedResult = String(toolResult)
      }
      
      console.log(`✅ Tool ${name} ejecutada exitosamente (${formattedResult.length} chars)`)
      
      results.push({
        tool_call_id: id,
        role: "tool",
        name,
        content: formattedResult
      })
      
    } catch (error) {
      console.error(`❌ Error ejecutando tool ${name}:`, error)
      
      results.push({
        tool_call_id: id,
        role: "tool",
        name,
        content: `Error ejecutando ${name}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    }
  }
  
  return results
}

/**
 * Extrae fuentes del texto de respuesta
 */
function extractSourcesFromResponse(text: string): Array<{ title: string; url: string }> {
  const sources: Array<{ title: string; url: string }> = []
  const urlRegex = /https?:\/\/[^\s\)\]\>]+/g
  const urls = text.match(urlRegex) || []
  
  for (const url of urls) {
    // Buscar título asociado
    const lines = text.split('\n')
    let title = ''
    
    for (const line of lines) {
      if (line.includes(url)) {
        // Buscar título en formato **Título**
        const titleMatch = line.match(/\*\*([^*]+)\*\*/)
        if (titleMatch) {
          title = titleMatch[1]
        }
        break
      }
    }
    
    if (!title) {
      try {
        title = new URL(url).hostname
      } catch {
        title = 'Fuente'
      }
    }
    
    sources.push({ title, url })
  }
  
  // Eliminar duplicados
  return Array.from(new Map(sources.map(s => [s.url, s])).values())
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`🤖 LEGAL AGENT - TOOL CALLING ENDPOINT`)
  console.log(`${'═'.repeat(80)}`)
  
  try {
    const { chatSettings, messages, chatId, userId } = await request.json() as RequestBody
    
    // Validar API Keys
    const openrouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY no configurada" },
        { status: 500 }
      )
    }
    
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      console.warn("⚠️ SERPER_API_KEY no configurada - las búsquedas fallarán")
    }
    
    // Inicializar cliente OpenAI apuntando a OpenRouter
    const client = new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
    
    // Extraer consulta del usuario
    const userQuery = extractLastUserMessage(messages)
    const isLegalQuery = requiresLegalSearch(userQuery)
    
    // Seleccionar modelo - usar uno que soporte tool calling
    // Nota: alibaba/tongyi-deepresearch-30b-a3b puede no soportar tools
    // Usar openai/gpt-4o-mini o anthropic/claude-3-haiku como alternativa
    let modelName = chatSettings.model
    
    // Lista de modelos que soportan tool calling en OpenRouter
    const toolCallingModels = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-4-turbo',
      'anthropic/claude-3-5-sonnet',
      'anthropic/claude-3-haiku',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-70b-instruct',
      // Modelos de investigación profunda con tool calling nativo
      'alibaba/tongyi-deepresearch-30b-a3b',
      'moonshotai/kimi-k2-thinking'
    ]
    
    // Si el modelo actual no soporta tools, usar fallback
    const supportsTools = toolCallingModels.some(m => 
      modelName.includes(m.split('/')[1]) || modelName === m
    )
    
    if (!supportsTools) {
      console.log(`⚠️ Modelo ${modelName} puede no soportar tool calling`)
      console.log(`💡 Considera usar: alibaba/tongyi-deepresearch-30b-a3b o moonshotai/kimi-k2-thinking`)
    }
    
    console.log(`📝 Query: "${userQuery.substring(0, 100)}..."`)
    console.log(`🤖 Modelo: ${modelName}`)
    console.log(`🔍 Requiere búsqueda legal: ${isLegalQuery}`)
    console.log(`💬 Chat ID: ${chatId || 'N/A'}`)
    
    // Construir mensajes con prompt del sistema
    const systemMessage = {
      role: "system" as const,
      content: LEGAL_AGENT_SYSTEM_PROMPT
    }
    
    // Agregar instrucción para forzar búsqueda si es consulta legal
    const userMessage = isLegalQuery
      ? `${userQuery}\n\n[INSTRUCCIÓN INTERNA: Esta es una consulta legal. DEBES usar search_legal_official antes de responder.]`
      : userQuery
    
    const conversationMessages = [
      systemMessage,
      ...messages.slice(0, -1), // Historial sin el último mensaje
      { role: "user" as const, content: userMessage }
    ]
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CICLO DE TOOL CALLING
    // ═══════════════════════════════════════════════════════════════════════════
    
    let currentMessages: any[] = [...conversationMessages]
    let finalResponse: string | null = null
    let totalToolCalls = 0
    const maxIterations = 5 // Máximo de rondas de tool calling
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      console.log(`\n📍 Iteración ${iteration + 1}/${maxIterations}`)
      
      // Llamar al modelo con tools
      const response = await client.chat.completions.create({
        model: modelName,
        messages: currentMessages,
        tools: LEGAL_TOOLS_DEFINITIONS,
        tool_choice: iteration === 0 && isLegalQuery ? "required" : "auto",
        temperature: chatSettings.temperature || 0.3,
        max_tokens: 4000
      })
      
      const message = response.choices[0]?.message
      
      if (!message) {
        console.error("❌ No se recibió mensaje del modelo")
        break
      }
      
      console.log(`📨 Respuesta recibida:`)
      console.log(`   - Contenido: ${message.content ? message.content.substring(0, 100) + '...' : 'N/A'}`)
      console.log(`   - Tool calls: ${message.tool_calls?.length || 0}`)
      
      // Si el modelo solicitó tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🔧 Procesando ${message.tool_calls.length} tool calls...`)
        
        // Agregar mensaje del asistente con tool_calls
        currentMessages.push({
          role: "assistant",
          content: message.content || null,
          tool_calls: message.tool_calls
        })
        
        // Ejecutar las tools
        const toolResults = await processToolCalls(message.tool_calls)
        totalToolCalls += toolResults.length
        
        // Agregar resultados de tools
        for (const result of toolResults) {
          currentMessages.push(result)
        }
        
        console.log(`✅ Tools ejecutadas, continuando...`)
        
      } else {
        // El modelo generó una respuesta final
        finalResponse = message.content || ""
        console.log(`✅ Respuesta final obtenida (${finalResponse.length} chars)`)
        break
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RESPUESTA FINAL
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (!finalResponse) {
      // Si no hay respuesta después de las iteraciones, generar una con los resultados
      console.log(`⚠️ No se obtuvo respuesta final, generando...`)
      
      const fallbackResponse = await client.chat.completions.create({
        model: modelName,
        messages: [
          ...currentMessages,
          {
            role: "user",
            content: "Por favor, genera una respuesta final basada en toda la información encontrada. Responde de forma directa y cita las fuentes."
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      })
      
      finalResponse = fallbackResponse.choices[0]?.message?.content || 
        "Lo siento, no pude completar la investigación. Por favor, intenta reformular tu pregunta."
    }
    
    // Extraer fuentes de la respuesta
    const sources = extractSourcesFromResponse(finalResponse)
    
    console.log(`\n${'═'.repeat(80)}`)
    console.log(`✅ RESPUESTA COMPLETADA`)
    console.log(`   📊 Tool calls totales: ${totalToolCalls}`)
    console.log(`   📚 Fuentes extraídas: ${sources.length}`)
    console.log(`   📝 Longitud respuesta: ${finalResponse.length} caracteres`)
    console.log(`${'═'.repeat(80)}\n`)
    
    // Crear stream de respuesta para compatibilidad
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Enviar respuesta en chunks para simular streaming
        const words = finalResponse!.split(' ')
        let index = 0
        
        const pushWord = () => {
          if (index < words.length) {
            const word = words[index] + (index < words.length - 1 ? ' ' : '')
            controller.enqueue(encoder.encode(word))
            index++
            setTimeout(pushWord, 10) // Streaming rápido
          } else {
            controller.close()
          }
        }
        
        pushWord()
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Tool-Calls': String(totalToolCalls),
        'X-Sources-Count': String(sources.length)
      }
    })
    
  } catch (error: any) {
    console.error(`❌ Error en Legal Agent:`, error)
    
    return NextResponse.json(
      { 
        error: error.message || "Error procesando la consulta",
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

/**
 * Endpoint GET para verificar estado
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Legal Agent with Tool Calling",
    tools: LEGAL_TOOLS_DEFINITIONS.map(t => t.function.name),
    requiredEnvVars: [
      "OPENROUTER_API_KEY",
      "SERPER_API_KEY"
    ]
  })
}

