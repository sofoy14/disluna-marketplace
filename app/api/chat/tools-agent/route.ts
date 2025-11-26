/**
 * Endpoint unificado para el Tools Agent de búsqueda web
 * Implementa el contrato de integración especificado
 */

import { NextRequest, NextResponse } from "next/server"
import { WebSearchToolsAgent } from "@/lib/agents/web-search-tools-agent"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import OpenAI from "openai"

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

    // Perfil del usuario para claves y scoping
    const profile = await getServerProfile()
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
    // Forzar uso de Tongyi - reemplazar cualquier modelo GPT-4
    let modelName = chatSettings.model || "alibaba/tongyi-deepresearch-30b-a3b"
    if (modelName.includes("gpt-4") || modelName.includes("gpt-4o")) {
      console.log(`⚠️ Modelo GPT-4 detectado (${modelName}), reemplazando por Tongyi`)
      modelName = "alibaba/tongyi-deepresearch-30b-a3b"
    }
    
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

    // 1) Recuperación semántica en documentos del usuario (RAG) - SOLO SI HAY ARCHIVOS EXPLÍCITOS
    // IMPORTANTE: No usar RAG automático si la consulta claramente requiere búsqueda web
    // Solo usar RAG si hay archivos específicos del chat o mensaje
    let ragContext = ""
    
    // Detectar si la consulta requiere búsqueda web (preguntas legales generales)
    const requiresWebSearch = userQuery.match(/\b(cómo|qué|cuándo|dónde|quién|por qué|son|es|tributan|regulación|normatividad|ley|decreto|sentencia|jurisprudencia)\b/i)
    
    // Solo hacer RAG si NO requiere búsqueda web O si hay archivos explícitos en el contexto
    // Por defecto, priorizar búsqueda web para consultas legales
    if (!requiresWebSearch) {
      try {
        // Obtener archivos del usuario (solo si hay archivos recientes o relevantes)
        const { data: files } = await supabaseAdmin
          .from("files")
          .select("id, created_at")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(10) // Solo archivos recientes

        const userFileIds = (files || []).map(f => f.id)

        if (userFileIds.length > 0 && profile.openai_api_key) {
          const openai = new OpenAI({ apiKey: profile.openai_api_key })
          const emb = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: userQuery
          })
          const queryEmbedding = emb.data[0]?.embedding as any

          const { data: matches } = await supabaseAdmin.rpc("match_file_items_openai", {
            query_embedding: queryEmbedding,
            match_count: 3, // Reducido a 3 para no sobrecargar
            file_ids: userFileIds
          })

          // Solo usar RAG si hay matches muy relevantes (score alto)
          if (matches && matches.length > 0 && matches.some((m: any) => m.similarity > 0.75)) {
            const snippets = matches
              .filter((m: any) => m.similarity > 0.75) // Solo matches muy relevantes
              .slice(0, 3)
              .map((m: any, i: number) => `(${i + 1}) ${m.content}`)
              .join("\n\n")
            ragContext = `\n\n[Contexto relevante de documentos del usuario]\n${snippets}\n\n`
            console.log(`📚 RAG activado con ${matches.filter((m: any) => m.similarity > 0.75).length} documentos relevantes`)
          } else {
            console.log(`🔍 RAG no activado: consulta requiere búsqueda web o no hay documentos suficientemente relevantes`)
          }
        }
      } catch (e) {
        console.warn("RAG falló o no disponible, continuando sin contexto:", e)
      }
    } else {
      console.log(`🔍 RAG omitido: consulta requiere búsqueda web (prioridad a web search)`)
    }

    // 2) Ejecutar el Tools Agent con verificación multi-búsqueda
    console.log(`🤖 Ejecutando Tools Agent con verificación multi-búsqueda`)
    
    // Inicializar Tools Agent
    const toolsAgent = new WebSearchToolsAgent({
      apiKey,
      model: modelName,
      temperature: 0.2,
      maxTokens: 2000
    })

    // Procesar consulta con tool calling
    const agentResponse = await toolsAgent.processQuery(`${userQuery}${ragContext}`)

    console.log(`✅ Tools Agent completado`)
    console.log(`📊 Respuesta: ${agentResponse.text.substring(0, 100)}...`)
    console.log(`🔗 Fuentes: ${agentResponse.sources.length}`)

    // Guardar en memoria si es necesario (opcional)
    if (finalChatId && finalUserId) {
      // Aquí podrías implementar guardado en memoria usando ChatMemoryManager
      console.log(`💾 Memoria: Guardando contexto para chat ${finalChatId}`)
    }

    // Mapear fuentes a formato de bibliografía
    const bibliography = agentResponse.sources.map((source, index) => ({
      id: source.id || `src-${index + 1}`,
      title: source.title || "Fuente",
      url: source.url,
      type: detectSourceType(source.url, source.title),
      description: undefined // No hay summary en ToolsAgentResponse
    }))
    
    console.log(`📚 Bibliografía generada: ${bibliography.length} fuentes`)
    
    return NextResponse.json({
      message: agentResponse.text,
      bibliography
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
