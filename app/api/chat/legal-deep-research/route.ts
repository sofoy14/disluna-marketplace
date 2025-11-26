/**
 * Endpoint Especializado Deep Research Legal Colombiano
 * Maximiza las capacidades de Tongyi Deep Research 30B A3B usando
 * Serper, Jina AI, HTTP fetch y herramientas especializadas
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import OpenAI from "openai"
import { searchLegalSpecialized } from "@/lib/tools/legal/legal-search-specialized"
import { extractUrlContent } from "@/lib/tools/web-search"

export const maxDuration = 120 // 120 segundos para investigación profunda

interface RequestBody {
  query: string
  chatId?: string
  userId?: string
  chatSettings?: {
    model?: string
    temperature?: number
  }
  messages?: Array<{
    role: string
    content: string
  }>
}

interface Source {
  title: string
  url: string
  type: "official" | "academic" | "general"
  content?: string
  snippet?: string
  relevance?: number
}

/**
 * Búsqueda con Serper optimizada para fuentes oficiales colombianas
 */
async function serperSearchOfficial(query: string, numResults: number = 10): Promise<Source[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    throw new Error("SERPER_API_KEY no configurada")
  }

  // Query especializada para fuentes oficiales colombianas
  const officialQuery = `${query} Colombia (site:corteconstitucional.gov.co OR site:consejodeestado.gov.co OR site:suin-juriscol.gov.co OR site:imprenta.gov.co OR site:superfinanciera.gov.co OR site:minjusticia.gov.co OR site:secretariasenado.gov.co OR site:congresogov.co) -site:wikipedia.org -site:wikimedia.org -site:wikidata.org`

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: officialQuery,
      num: numResults,
      gl: "co",
      hl: "es"
    })
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`)
  }

  const data = await response.json()
  const items = data.organic || []

  return items.map((item: any) => ({
    title: item.title || "Sin título",
    url: item.link || "",
    type: "official" as const,
    snippet: item.snippet || "",
    relevance: calculateRelevance(item.title, item.snippet, query)
  }))
}

/**
 * Búsqueda con Serper para fuentes académicas
 */
async function serperSearchAcademic(query: string, numResults: number = 10): Promise<Source[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    throw new Error("SERPER_API_KEY no configurada")
  }

  const academicQuery = `${query} Colombia (site:edu.co OR site:scholar.google.com OR site:scielo.org OR site:redalyc.org) derecho -site:wikipedia.org`

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: academicQuery,
      num: numResults,
      gl: "co",
      hl: "es"
    })
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`)
  }

  const data = await response.json()
  const items = data.organic || []

  return items.map((item: any) => ({
    title: item.title || "Sin título",
    url: item.link || "",
    type: "academic" as const,
    snippet: item.snippet || "",
    relevance: calculateRelevance(item.title, item.snippet, query)
  }))
}

/**
 * Búsqueda general con Serper (sin Wikipedia)
 */
async function serperSearchGeneral(query: string, numResults: number = 10): Promise<Source[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    throw new Error("SERPER_API_KEY no configurada")
  }

  const generalQuery = `${query} Colombia derecho legal -site:wikipedia.org -site:wikimedia.org -site:wikidata.org`

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: generalQuery,
      num: numResults,
      gl: "co",
      hl: "es"
    })
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`)
  }

  const data = await response.json()
  const items = data.organic || []

  return items.map((item: any) => ({
    title: item.title || "Sin título",
    url: item.link || "",
    type: "general" as const,
    snippet: item.snippet || "",
    relevance: calculateRelevance(item.title, item.snippet, query)
  }))
}

/**
 * Extrae contenido usando Jina AI Reader
 */
async function jinaRead(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain"
      }
    })
    
    if (!response.ok) {
      return ""
    }
    
    const text = await response.text()
    return text.slice(0, 400_000) // Límite de Jina
  } catch (error) {
    console.error(`Error en Jina Read para ${url}:`, error)
    return ""
  }
}

/**
 * Extrae contenido usando HTTP fetch directo
 */
async function httpFetch(url: string): Promise<string> {
  const maxBytes = 400_000
  let attempt = 0
  
  while (attempt < 2) {
    attempt++
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LegalBot/1.0)" }
      })
      
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 500 * attempt))
        continue
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const html = await res.text()
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      
      return text.slice(0, maxBytes)
    } catch (error) {
      if (attempt >= 2) {
        throw error
      }
    }
  }
  
  throw new Error("Rate limited")
}

/**
 * Calcula relevancia de un resultado
 */
function calculateRelevance(title: string, snippet: string, query: string): number {
  const queryLower = query.toLowerCase()
  const titleLower = title.toLowerCase()
  const snippetLower = snippet.toLowerCase()
  
  let relevance = 0
  
  // Palabras clave en título (mayor peso)
  const titleWords = queryLower.split(" ")
  titleWords.forEach(word => {
    if (titleLower.includes(word)) relevance += 3
  })
  
  // Palabras clave en snippet
  const snippetWords = queryLower.split(" ")
  snippetWords.forEach(word => {
    if (snippetLower.includes(word)) relevance += 1
  })
  
  // Bonus por dominio oficial
  if (title.includes(".gov.co") || snippet.includes(".gov.co")) {
    relevance += 5
  }
  
  return Math.min(relevance, 20)
}

/**
 * Enriquece fuentes con contenido completo usando Jina y HTTP fetch
 */
async function enrichSources(sources: Source[], maxEnriched: number = 5): Promise<Source[]> {
  const enriched: Source[] = []
  const toEnrich = sources.slice(0, maxEnriched)
  
  for (const source of toEnrich) {
    try {
      // Intentar primero con Jina (más confiable)
      let content = await jinaRead(source.url)
      
      // Si Jina falla o da poco contenido, intentar HTTP fetch
      if (!content || content.length < 500) {
        try {
          const httpContent = await httpFetch(source.url)
          if (httpContent && httpContent.length > content.length) {
            content = httpContent
          }
        } catch (error) {
          console.warn(`HTTP fetch falló para ${source.url}`)
        }
      }
      
      // Si aún no hay contenido, usar extractUrlContent como fallback
      if (!content || content.length < 200) {
        try {
          const extracted = await extractUrlContent(source.url)
          if (extracted && extracted.length > content.length) {
            content = extracted
          }
        } catch (error) {
          console.warn(`extractUrlContent falló para ${source.url}`)
        }
      }
      
      enriched.push({
        ...source,
        content: content || source.snippet || "Contenido no disponible"
      })
    } catch (error) {
      console.error(`Error enriqueciendo ${source.url}:`, error)
      enriched.push(source)
    }
  }
  
  // Agregar el resto sin enriquecer
  enriched.push(...sources.slice(maxEnriched))
  
  return enriched
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { query, chatId, userId, chatSettings, messages } = body

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query es requerida y debe ser un string" },
        { status: 400 }
      )
    }

    console.log(`\n⚖️ LEGAL DEEP RESEARCH ENDPOINT`)
    console.log(`📝 Query: "${query}"`)
    console.log(`💬 Chat ID: ${chatId || "N/A"}`)
    console.log(`👤 User ID: ${userId || "N/A"}`)
    console.log(`${'='.repeat(80)}`)

    // Validar API keys
    const profile = await getServerProfile()
    const apiKey = process.env.OPENROUTER_API_KEY || profile.openrouter_api_key
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API Key no configurada" },
        { status: 500 }
      )
    }

    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      return NextResponse.json(
        { error: "Serper API Key no configurada" },
        { status: 500 }
      )
    }

    // Configurar cliente OpenAI para OpenRouter
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })

    const modelName = chatSettings?.model || "alibaba/tongyi-deepresearch-30b-a3b"
    const temperature = chatSettings?.temperature || 0.2

    console.log(`🤖 Modelo: ${modelName}`)
    console.log(`🌡️ Temperature: ${temperature}`)

    // FASE 1: Búsqueda multi-estrategia con Serper
    console.log(`\n🔍 FASE 1: BÚSQUEDA MULTI-ESTRATEGIA CON SERPER`)
    
    let allSources: Source[] = []
    
    // Estrategia 1: Fuentes oficiales (máxima prioridad)
    try {
      console.log(`📋 Buscando en fuentes oficiales colombianas...`)
      const officialSources = await serperSearchOfficial(query, 10)
      allSources.push(...officialSources)
      console.log(`✅ Fuentes oficiales: ${officialSources.length} encontradas`)
    } catch (error) {
      console.error(`❌ Error en búsqueda oficial:`, error)
    }

    // Estrategia 2: Fuentes académicas
    try {
      console.log(`📚 Buscando en fuentes académicas...`)
      const academicSources = await serperSearchAcademic(query, 8)
      allSources.push(...academicSources)
      console.log(`✅ Fuentes académicas: ${academicSources.length} encontradas`)
    } catch (error) {
      console.error(`❌ Error en búsqueda académica:`, error)
    }

    // Estrategia 3: Búsqueda general (si necesitamos más fuentes)
    if (allSources.length < 15) {
      try {
        console.log(`🌐 Buscando en fuentes generales...`)
        const generalSources = await serperSearchGeneral(query, 10)
        allSources.push(...generalSources)
        console.log(`✅ Fuentes generales: ${generalSources.length} encontradas`)
      } catch (error) {
        console.error(`❌ Error en búsqueda general:`, error)
      }
    }

    // Eliminar duplicados por URL
    const uniqueSources = Array.from(
      new Map(allSources.map(s => [s.url, s])).values()
    )

    // Ordenar por relevancia y tipo (oficiales primero)
    uniqueSources.sort((a, b) => {
      const typeOrder = { official: 3, academic: 2, general: 1 }
      const typeDiff = (typeOrder[b.type] || 0) - (typeOrder[a.type] || 0)
      if (typeDiff !== 0) return typeDiff
      return (b.relevance || 0) - (a.relevance || 0)
    })

    console.log(`📊 Total de fuentes únicas: ${uniqueSources.length}`)

    // FASE 2: Enriquecimiento con Jina y HTTP fetch
    console.log(`\n📚 FASE 2: ENRIQUECIMIENTO CON JINA Y HTTP FETCH`)
    const enrichedSources = await enrichSources(uniqueSources.slice(0, 15), 8)
    console.log(`✅ Fuentes enriquecidas: ${enrichedSources.filter(s => s.content && s.content.length > 500).length}`)

    // FASE 3: Deep Research con Tongyi usando tool calling
    console.log(`\n🤖 FASE 3: DEEP RESEARCH CON TONGYI`)
    
    // Definir herramientas para tool calling
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "serper_search",
          description: "Busca información en la web usando Serper (Google). Especializado para fuentes oficiales colombianas.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Query de búsqueda optimizada para fuentes oficiales colombianas"
              },
              numResults: {
                type: "number",
                description: "Número de resultados deseados (máximo 10)",
                default: 5
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "jina_read",
          description: "Extrae el contenido completo de una URL usando Jina AI Reader. Ideal para obtener texto completo de documentos legales.",
          parameters: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL a leer y extraer contenido"
              }
            },
            required: ["url"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "http_fetch",
          description: "Obtiene y limpia HTML→texto de una URL para análisis directo.",
          parameters: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL a obtener y procesar"
              }
            },
            required: ["url"]
          }
        }
      }
    ]

    // Prompt del sistema especializado para derecho colombiano
    const systemPrompt = `Eres un Agente de Investigación Legal Colombiano especializado en Deep Research.
Tu objetivo es realizar una investigación profunda y completa sobre consultas de derecho colombiano.

POLÍTICA DE HERRAMIENTAS:
- Usa serper_search para encontrar información adicional o verificar datos específicos
- Usa jina_read para extraer contenido completo de URLs importantes (prioriza fuentes oficiales .gov.co)
- Usa http_fetch como alternativa si jina_read no está disponible
- Realiza múltiples búsquedas iterativas hasta obtener información completa

ESTRATEGIA DE INVESTIGACIÓN:
- Prioriza SIEMPRE fuentes oficiales colombianas (Corte Constitucional, Consejo de Estado, Cortes, Superintendencias)
- NUNCA uses números de artículos o leyes específicos sin verificación
- Realiza búsquedas complementarias si la información inicial es insuficiente
- Verifica consistencia entre múltiples fuentes

FORMATO DE RESPUESTA:
- Respuesta clara, fundamentada y especializada en derecho colombiano
- Incluye contexto legal relevante
- Cita fuentes oficiales cuando sea posible
- NO incluyas bibliografía dentro del texto principal (se enviará separada)

IMPORTANTE:
- SIEMPRE asume que la consulta es sobre derecho colombiano
- NUNCA preguntes por la jurisdicción
- SIEMPRE cita fuentes oficiales colombianas cuando sea posible
- Realiza investigación profunda usando las herramientas disponibles`

    // Construir contexto con fuentes enriquecidas
    const contextSources = enrichedSources.slice(0, 10)
    const contextText = contextSources
      .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nTipo: ${s.type}\n${s.content ? `Contenido: ${s.content.slice(0, 2000)}...` : `Snippet: ${s.snippet}`}`)
      .join("\n\n")

    // Primera llamada: investigación con herramientas
    const researchMessages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Consulta legal: "${query}"

Contexto inicial obtenido:
${contextText}

Realiza una investigación profunda adicional usando las herramientas disponibles. Busca información complementaria si es necesario y extrae contenido de URLs relevantes.`
      }
    ]

    const firstResponse = await openai.chat.completions.create({
      model: modelName,
      messages: researchMessages,
      tools,
      tool_choice: "auto",
      temperature: temperature,
      max_tokens: 4000
    })

    const firstMessage = firstResponse.choices[0]?.message
    if (!firstMessage) {
      throw new Error("No se recibió respuesta del modelo")
    }

    // Ejecutar herramientas llamadas
    const toolResults: any[] = []
    const collectedSources: Source[] = [...enrichedSources]

    if (firstMessage.tool_calls && firstMessage.tool_calls.length > 0) {
      console.log(`🔧 Ejecutando ${firstMessage.tool_calls.length} herramienta(s)...`)
      
      for (const toolCall of firstMessage.tool_calls) {
        const { name, arguments: args } = toolCall.function
        const parsedArgs = JSON.parse(args)
        
        try {
          let result: string
          
          if (name === "serper_search") {
            // Buscar con Serper usando la query del modelo
            const searchQuery = parsedArgs.query
            const numResults = parsedArgs.numResults || 5
            
            // Intentar búsqueda oficial primero
            const additionalSources = await serperSearchOfficial(searchQuery, numResults)
            collectedSources.push(...additionalSources)
            
            result = JSON.stringify({
              results: additionalSources.map(s => ({
                title: s.title,
                url: s.url,
                snippet: s.snippet
              })),
              count: additionalSources.length
            })
          } else if (name === "jina_read") {
            const url = parsedArgs.url
            const content = await jinaRead(url)
            result = content || `No se pudo extraer contenido de ${url}`
            
            // Agregar a fuentes si no está ya
            if (!collectedSources.find(s => s.url === url)) {
              collectedSources.push({
                title: url,
                url: url,
                type: "general",
                content: content
              })
            }
          } else if (name === "http_fetch") {
            const url = parsedArgs.url
            const content = await httpFetch(url)
            result = content || `No se pudo obtener contenido de ${url}`
            
            // Agregar a fuentes si no está ya
            if (!collectedSources.find(s => s.url === url)) {
              collectedSources.push({
                title: url,
                url: url,
                type: "general",
                content: content
              })
            }
          } else {
            result = `Herramienta ${name} no reconocida`
          }
          
          toolResults.push({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            name,
            content: result
          })
        } catch (error) {
          console.error(`❌ Error ejecutando ${name}:`, error)
          toolResults.push({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            name,
            content: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
          })
        }
      }
    }

    // Segunda llamada: síntesis final con todos los resultados
    const finalMessages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Consulta legal: "${query}"

Fuentes encontradas y procesadas:
${contextText}

${toolResults.length > 0 ? `\nInformación adicional obtenida mediante herramientas:\n${toolResults.map(tr => `- ${tr.name}: ${tr.content.slice(0, 500)}...`).join('\n')}` : ''}

Genera una respuesta legal completa, fundamentada y especializada en derecho colombiano basándote en toda la información recopilada.`
      },
      firstMessage,
      ...toolResults
    ]

    const finalResponse = await openai.chat.completions.create({
      model: modelName,
      messages: finalMessages,
      temperature: temperature,
      max_tokens: 4000
    })

    const finalText = finalResponse.choices[0]?.message?.content || "No se pudo generar una respuesta."

    // Eliminar duplicados finales y ordenar
    const uniqueFinalSources = Array.from(
      new Map(collectedSources.map(s => [s.url, s])).values()
    ).sort((a, b) => {
      const typeOrder = { official: 3, academic: 2, general: 1 }
      const typeDiff = (typeOrder[b.type] || 0) - (typeOrder[a.type] || 0)
      if (typeDiff !== 0) return typeDiff
      return (b.relevance || 0) - (a.relevance || 0)
    })

    console.log(`✅ Deep Research completado`)
    console.log(`📊 Fuentes finales: ${uniqueFinalSources.length}`)
    console.log(`📝 Longitud de respuesta: ${finalText.length} caracteres`)

    return NextResponse.json({
      success: true,
      message: finalText,
      bibliography: uniqueFinalSources.slice(0, 15).map((source, i) => ({
        id: `src-${i + 1}`,
        title: source.title,
        url: source.url,
        type: detectSourceType(source.url, source.title),
        description: source.snippet || source.content?.slice(0, 300) || ""
      })),
      metadata: {
        totalSources: uniqueFinalSources.length,
        officialSources: uniqueFinalSources.filter(s => s.type === "official").length,
        academicSources: uniqueFinalSources.filter(s => s.type === "academic").length,
        generalSources: uniqueFinalSources.filter(s => s.type === "general").length,
        enrichedCount: uniqueFinalSources.filter(s => s.content && s.content.length > 500).length,
        toolsUsed: firstMessage.tool_calls?.map(tc => tc.function.name) || [],
        researchRounds: 1
      }
    })

  } catch (error) {
    console.error(`❌ Error en Legal Deep Research endpoint:`, error)
    
    return NextResponse.json(
      {
        success: false,
        message: "Lo siento, hubo un error procesando tu consulta legal. Por favor, intenta reformular tu pregunta.",
        bibliography: [],
        error: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
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
  if (urlLower.includes('edu.co') || urlLower.includes('scholar') || urlLower.includes('scielo')) {
    return 'fuente académica'
  }
  
  return 'documento web'
}






