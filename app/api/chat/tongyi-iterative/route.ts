/**
 * Endpoint con Búsqueda Iterativa para Tongyi
 * 
 * Este endpoint implementa un patrón de investigación iterativa donde:
 * 1. El modelo genera queries de búsqueda
 * 2. El backend ejecuta las búsquedas
 * 3. El modelo evalúa si necesita más información
 * 4. Repite hasta tener información suficiente
 * 5. Sintetiza una respuesta final
 */

import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"
export const maxDuration = 180 // 3 minutos para búsqueda iterativa completa

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string // Contenido completo extraído con Jina AI
  type: 'official' | 'academic' | 'general'
}

interface ResearchRound {
  roundNumber: number
  query: string
  results: SearchResult[]
  modelAnalysis: string
  needsMoreInfo: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// BÚSQUEDA CON SERPER API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrae contenido completo de una URL usando Jina AI Reader
 */
async function extractContentWithJina(url: string): Promise<string> {
  try {
    console.log(`📄 Extrayendo contenido de: ${url.substring(0, 60)}...`)
    
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; AsistenteLegal/1.0)'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      console.log(`⚠️ Jina error ${response.status} para ${url.substring(0, 40)}`)
      return ''
    }

    const content = await response.text()
    
    // Limpiar y truncar contenido
    const cleanContent = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 3000) // Máximo 3000 caracteres por URL

    console.log(`✅ Extraído: ${cleanContent.length} caracteres`)
    return cleanContent

  } catch (error) {
    console.log(`⚠️ Error extrayendo ${url.substring(0, 40)}: ${error}`)
    return ''
  }
}

/**
 * Busca y extrae contenido de fuentes web
 */
async function searchWithSerper(query: string, numResults: number = 8): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  
  if (!apiKey) {
    console.error('❌ SERPER_API_KEY no configurada')
    return []
  }

  // Optimizar query para fuentes colombianas legales
  const optimizedQuery = query.toLowerCase().includes('colombia') 
    ? query 
    : `${query} Colombia`

  console.log(`🔍 Serper Search: "${optimizedQuery}"`)

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: optimizedQuery,
        num: numResults,
        gl: "co", // Colombia
        hl: "es"  // Español
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Serper API error ${response.status}: ${errorText.substring(0, 100)}`)
      return []
    }

    const data = await response.json()
    const organic = data.organic || []

    console.log(`✅ Serper: ${organic.length} resultados`)

    // Convertir a resultados básicos
    const basicResults: SearchResult[] = organic.map((item: any) => ({
      title: item.title || 'Sin título',
      url: item.link || '',
      snippet: item.snippet || '',
      content: '', // Se llenará después
      type: classifySource(item.link || '')
    }))

    // IMPORTANTE: Extraer contenido real de las primeras 3 fuentes oficiales
    const officialResults = basicResults.filter(r => r.type === 'official')
    const toExtract = officialResults.slice(0, 3)

    if (toExtract.length > 0) {
      console.log(`📄 Extrayendo contenido de ${toExtract.length} fuentes oficiales...`)
      
      const extractedContents = await Promise.all(
        toExtract.map(async (result) => {
          const content = await extractContentWithJina(result.url)
          return { url: result.url, content }
        })
      )

      // Actualizar resultados con contenido extraído
      for (const result of basicResults) {
        const extracted = extractedContents.find(e => e.url === result.url)
        if (extracted && extracted.content) {
          result.content = extracted.content
          result.snippet = extracted.content.slice(0, 500) // Actualizar snippet también
        }
      }

      console.log(`✅ Contenido extraído de ${extractedContents.filter(e => e.content).length} fuentes`)
    }

    return basicResults

  } catch (error) {
    console.error(`❌ Error en Serper:`, error)
    return []
  }
}

function classifySource(url: string): 'official' | 'academic' | 'general' {
  const urlLower = url.toLowerCase()
  
  // Fuentes oficiales colombianas
  const officialDomains = [
    '.gov.co', 'corteconstitucional', 'consejodeestado', 'suin-juriscol',
    'secretariasenado', 'funcionpublica', 'ramajudicial', 'imprenta.gov',
    'minjusticia', 'superfinanciera', 'dian.gov', 'procuraduria',
    'contraloria', 'fiscalia', 'defensoria'
  ]
  
  if (officialDomains.some(domain => urlLower.includes(domain))) {
    return 'official'
  }
  
  // Fuentes académicas
  if (urlLower.includes('.edu.co') || urlLower.includes('redalyc') || urlLower.includes('scielo')) {
    return 'academic'
  }
  
  return 'general'
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS PARA EL LOOP ITERATIVO
// ═══════════════════════════════════════════════════════════════════════════════

const QUERY_GENERATION_PROMPT = `Eres un investigador legal colombiano experto. Tu tarea es generar queries de búsqueda para encontrar información jurídica precisa.

## INSTRUCCIONES

Analiza la pregunta del usuario y genera UNA query de búsqueda optimizada para encontrar información legal colombiana.

**Formato de respuesta OBLIGATORIO (JSON válido):**
\`\`\`json
{
  "query": "tu query de búsqueda aquí",
  "objetivo": "qué información específica buscas"
}
\`\`\`

**Reglas para la query:**
- Incluye términos legales específicos (ley, decreto, artículo, código, sentencia, etc.)
- Agrega "Colombia" si no está implícito
- Sé específico pero conciso (máximo 10 palabras)
- Para normas, incluye identificadores si los conoces (ej: "Ley 1564 de 2012")
- Para jurisprudencia, incluye tipo de sentencia (C-, T-, SU-)

**Ejemplos de buenas queries:**
- "prescripción adquisitiva requisitos código civil Colombia"
- "acción de tutela plazo interposición Colombia"
- "sentencia C-355 aborto Corte Constitucional"
- "Ley 1564 2012 código general proceso Colombia"`

const EVALUATION_PROMPT = `Eres un investigador legal colombiano evaluando resultados de búsqueda.

## RESULTADOS DE BÚSQUEDA

{{SEARCH_RESULTS}}

## PREGUNTA ORIGINAL DEL USUARIO

{{USER_QUESTION}}

## INFORMACIÓN YA RECOPILADA

{{PREVIOUS_INFO}}

## TU TAREA

Evalúa si los resultados son SUFICIENTES para responder completamente la pregunta del usuario.

**Criterios de suficiencia:**
1. ¿Hay información de fuentes oficiales (.gov.co)?
2. ¿Se encontraron los artículos/leyes específicos mencionados?
3. ¿Se puede dar una respuesta completa y fundamentada?

**Formato de respuesta OBLIGATORIO (JSON válido):**
\`\`\`json
{
  "suficiente": true o false,
  "informacionEncontrada": "resumen breve de lo encontrado",
  "informacionFaltante": "qué información específica falta (vacío si suficiente=true)",
  "siguienteQuery": "query para buscar lo que falta (vacío si suficiente=true)",
  "confianza": número del 1 al 10
}
\`\`\``

const SYNTHESIS_PROMPT = `Eres un Agente de Investigación Legal Colombiano EXPERTO.

## INFORMACIÓN RECOPILADA DE MÚLTIPLES BÚSQUEDAS

{{ALL_RESEARCH}}

## PREGUNTA DEL USUARIO

{{USER_QUESTION}}

## TU TAREA

Sintetiza toda la información recopilada en una respuesta jurídica PRECISA.

## REGLAS ABSOLUTAS SOBRE ARTÍCULOS Y LEYES

1. **CITA TEXTUALMENTE** cuando encuentres el texto de un artículo en los resultados
2. **Si se pregunta por un artículo específico**, busca su texto exacto en el contenido extraído y TRANSCRÍBELO
3. **NO parafrasees** artículos de leyes - cita el texto original
4. **Si NO encuentras el texto exacto** de un artículo, di claramente: "No se encontró el texto completo del artículo X en las fuentes consultadas"
5. **NUNCA inventes** el contenido de un artículo

## CÓMO CITAR ARTÍCULOS

Cuando encuentres un artículo en el contenido extraído, preséntalo así:

> **Artículo [número] - [Nombre de la norma]:**
> "[Texto exacto del artículo tal como aparece en la fuente]"
> 
> Fuente: [URL]

## REGLAS GENERALES

1. USA SOLO la información de las búsquedas - NO inventes datos
2. CITA las fuentes con sus URLs
3. Si la información está incompleta, indícalo claramente
4. Prioriza fuentes oficiales (.gov.co)

## ESTRUCTURA DE RESPUESTA

1. **Texto del artículo o norma** (citado textualmente si está disponible)
2. **Análisis o explicación** (basado en la información encontrada)
3. **Fuentes consultadas**

Responde en español colombiano con terminología jurídica precisa:`

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrae JSON de la respuesta del modelo
 */
function extractJSON(text: string): any {
  if (!text) return null
  
  // Intentar extraer JSON de bloques de código
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim())
    } catch (e) {
      console.log('⚠️ Error parseando JSON de bloque:', e)
    }
  }
  
  // Intentar extraer JSON directo
  const jsonDirectMatch = text.match(/\{[\s\S]*\}/)
  if (jsonDirectMatch) {
    try {
      return JSON.parse(jsonDirectMatch[0])
    } catch (e) {
      console.log('⚠️ Error parseando JSON directo:', e)
    }
  }
  
  return null
}

/**
 * Formatea resultados de búsqueda para el modelo
 */
function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No se encontraron resultados para esta búsqueda."
  }
  
  return results.map((r, i) => {
    const typeEmoji = r.type === 'official' ? '🏛️ OFICIAL' : 
                      r.type === 'academic' ? '📚 ACADÉMICO' : '🌐 GENERAL'
    // Usar contenido completo si está disponible, sino el snippet
    const displayContent = r.content && r.content.length > 100 
      ? r.content 
      : r.snippet
    const contentLabel = r.content && r.content.length > 100 
      ? '📄 Contenido extraído' 
      : '📝 Snippet'
    return `${i + 1}. [${typeEmoji}] **${r.title}**
   URL: ${r.url}
   ${contentLabel}: ${displayContent}`
  }).join('\n\n')
}

/**
 * Formatea toda la investigación acumulada
 */
function formatAllResearch(rounds: ResearchRound[]): string {
  if (rounds.length === 0) return "No se ha realizado ninguna búsqueda aún."
  
  return rounds.map(round => {
    const officialCount = round.results.filter(r => r.type === 'official').length
    return `### 🔍 Ronda ${round.roundNumber}: "${round.query}"
**Resultados:** ${round.results.length} (${officialCount} oficiales)

${formatSearchResults(round.results)}

**Análisis:** ${round.modelAnalysis}`
  }).join('\n\n---\n\n')
}

/**
 * Detecta si la consulta requiere búsqueda legal
 */
function requiresLegalSearch(query: string): boolean {
  const legalKeywords = [
    'ley', 'decreto', 'artículo', 'código', 'sentencia', 'jurisprudencia',
    'constitución', 'tutela', 'demanda', 'proceso', 'prescripción',
    'derecho', 'legal', 'norma', 'tribunal', 'corte', 'penal', 'civil',
    'comercial', 'laboral', 'tributario', 'contrato', 'colombia',
    'requisitos', 'procedimiento', 'cómo', 'qué', 'cuándo', 'cuáles',
    'dian', 'superintendencia', 'ministerio', 'obligación', 'responsabilidad'
  ]
  
  const queryLower = query.toLowerCase()
  return legalKeywords.some(keyword => queryLower.includes(keyword))
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  console.log(`\n${'═'.repeat(80)}`)
  console.log(`🔄 TONGYI ITERATIVE RESEARCH - BÚSQUEDA ITERATIVA`)
  console.log(`${'═'.repeat(80)}`)

  try {
    const { chatSettings, messages } = await request.json()

    // Validar API Keys
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY no configurada" }, 
        { status: 500 }
      )
    }

    const serperKey = process.env.SERPER_API_KEY
    if (!serperKey) {
      console.warn("⚠️ SERPER_API_KEY no configurada - las búsquedas fallarán")
    }

    // Inicializar cliente OpenAI para OpenRouter
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })

    // Usar Tongyi o el modelo especificado
    const modelName = chatSettings.model || "alibaba/tongyi-deepresearch-30b-a3b"
    
    // Extraer pregunta del usuario
    const userMessages = messages.filter((m: any) => m.role === 'user')
    const userQuestion = userMessages[userMessages.length - 1]?.content || ''

    console.log(`📝 Pregunta: "${userQuestion.substring(0, 100)}..."`)
    console.log(`🤖 Modelo: ${modelName}`)

    // Verificar si requiere búsqueda legal
    if (!requiresLegalSearch(userQuestion)) {
      console.log(`💬 Consulta general - respondiendo sin búsqueda web`)
      
      const directResponse = await client.chat.completions.create({
        model: modelName,
        messages: [
          { 
            role: "system", 
            content: "Eres un asistente legal colombiano. Responde de manera clara y profesional." 
          },
          ...messages
        ],
        temperature: chatSettings.temperature || 0.3,
        max_tokens: 2000,
        stream: true
      })

      // Crear stream simple
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of directResponse) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
          controller.close()
        }
      })

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOOP DE BÚSQUEDA ITERATIVA
    // ═══════════════════════════════════════════════════════════════════════

    const researchRounds: ResearchRound[] = []
    const MAX_ROUNDS = 5
    let needsMoreInfo = true
    let roundNumber = 0

    console.log(`🔍 Iniciando investigación iterativa (máx ${MAX_ROUNDS} rondas)...`)

    while (needsMoreInfo && roundNumber < MAX_ROUNDS) {
      roundNumber++
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`📍 RONDA ${roundNumber}/${MAX_ROUNDS}`)
      console.log(`${'─'.repeat(60)}`)

      // ─────────────────────────────────────────────────────────────────────
      // PASO 1: Generar query de búsqueda
      // ─────────────────────────────────────────────────────────────────────

      let contextForQuery: string
      if (roundNumber === 1) {
        contextForQuery = `Pregunta del usuario: "${userQuestion}"\n\nGenera la primera query de búsqueda para encontrar información relevante.`
      } else {
        const previousInfo = researchRounds.map(r => r.modelAnalysis).join('\n')
        contextForQuery = `Pregunta del usuario: "${userQuestion}"

Información ya encontrada en rondas anteriores:
${previousInfo}

Genera una nueva query para buscar la información que aún falta.`
      }

      console.log(`🧠 Generando query de búsqueda...`)

      const queryResponse = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: QUERY_GENERATION_PROMPT },
          { role: "user", content: contextForQuery }
        ],
        temperature: 0.3,
        max_tokens: 500
      })

      const queryText = queryResponse.choices[0]?.message?.content || ''
      let queryData = extractJSON(queryText)
      
      // Fallback si no se puede extraer JSON
      if (!queryData?.query) {
        console.log(`⚠️ No se pudo extraer JSON, usando query por defecto`)
        queryData = { 
          query: roundNumber === 1 ? userQuestion : `${userQuestion} información adicional`,
          objetivo: "Encontrar información legal relevante"
        }
      }

      console.log(`🔍 Query generada: "${queryData.query}"`)
      console.log(`🎯 Objetivo: ${queryData.objetivo || 'N/A'}`)

      // ─────────────────────────────────────────────────────────────────────
      // PASO 2: Ejecutar búsqueda con Serper
      // ─────────────────────────────────────────────────────────────────────

      const searchResults = await searchWithSerper(queryData.query)
      
      const officialCount = searchResults.filter(r => r.type === 'official').length
      const academicCount = searchResults.filter(r => r.type === 'academic').length
      
      console.log(`✅ Resultados: ${searchResults.length} total`)
      console.log(`   🏛️ Oficiales: ${officialCount}`)
      console.log(`   📚 Académicos: ${academicCount}`)

      // ─────────────────────────────────────────────────────────────────────
      // PASO 3: Evaluar si necesita más información
      // ─────────────────────────────────────────────────────────────────────

      const previousInfo = researchRounds.length > 0 
        ? researchRounds.map(r => `Ronda ${r.roundNumber}: ${r.modelAnalysis}`).join('\n')
        : "Esta es la primera ronda de búsqueda."

      const evaluationPrompt = EVALUATION_PROMPT
        .replace('{{SEARCH_RESULTS}}', formatSearchResults(searchResults))
        .replace('{{USER_QUESTION}}', userQuestion)
        .replace('{{PREVIOUS_INFO}}', previousInfo)

      console.log(`🧠 Evaluando resultados...`)

      const evalResponse = await client.chat.completions.create({
        model: modelName,
        messages: [
          { 
            role: "system", 
            content: "Eres un evaluador de investigación legal. Responde SIEMPRE en formato JSON válido." 
          },
          { role: "user", content: evaluationPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      })

      const evalText = evalResponse.choices[0]?.message?.content || ''
      let evalData = extractJSON(evalText)

      // Fallback si no se puede extraer JSON
      if (!evalData) {
        console.log(`⚠️ No se pudo extraer evaluación JSON, usando heurísticas`)
        evalData = {
          suficiente: officialCount >= 2 || roundNumber >= 3,
          informacionEncontrada: `Se encontraron ${searchResults.length} resultados (${officialCount} oficiales)`,
          informacionFaltante: officialCount < 2 ? "Más fuentes oficiales" : "",
          confianza: officialCount >= 2 ? 7 : 5
        }
      }

      // Guardar ronda de investigación
      researchRounds.push({
        roundNumber,
        query: queryData.query,
        results: searchResults,
        modelAnalysis: evalData.informacionEncontrada || `Encontrados ${searchResults.length} resultados`,
        needsMoreInfo: evalData.suficiente === false
      })

      console.log(`📊 Evaluación:`)
      console.log(`   ✓ Suficiente: ${evalData.suficiente ? 'SÍ' : 'NO'}`)
      console.log(`   📝 Encontrado: ${evalData.informacionEncontrada?.substring(0, 80)}...`)
      console.log(`   🎯 Confianza: ${evalData.confianza || 'N/A'}/10`)

      // Determinar si continuar
      if (evalData.suficiente === true) {
        needsMoreInfo = false
        console.log(`✅ Información SUFICIENTE - finalizando búsqueda`)
      } else if (evalData.siguienteQuery) {
        console.log(`🔄 Necesita más info: ${evalData.informacionFaltante}`)
        console.log(`📝 Siguiente query sugerida: ${evalData.siguienteQuery}`)
      } else {
        // Criterios de parada por heurísticas
        const totalOfficial = researchRounds.reduce((sum, r) => 
          sum + r.results.filter(res => res.type === 'official').length, 0)
        
        if (totalOfficial >= 4 || roundNumber >= 3) {
          needsMoreInfo = false
          console.log(`✅ Criterio de parada alcanzado: ${totalOfficial} fuentes oficiales totales`)
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SÍNTESIS FINAL
    // ═══════════════════════════════════════════════════════════════════════

    const totalSources = researchRounds.reduce((sum, r) => sum + r.results.length, 0)
    const totalOfficial = researchRounds.reduce((sum, r) => 
      sum + r.results.filter(res => res.type === 'official').length, 0)

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`📊 INVESTIGACIÓN COMPLETADA`)
    console.log(`   🔍 Rondas: ${roundNumber}`)
    console.log(`   📚 Fuentes totales: ${totalSources}`)
    console.log(`   🏛️ Fuentes oficiales: ${totalOfficial}`)
    console.log(`${'═'.repeat(60)}`)

    const synthesisPrompt = SYNTHESIS_PROMPT
      .replace('{{ALL_RESEARCH}}', formatAllResearch(researchRounds))
      .replace('{{USER_QUESTION}}', userQuestion)

    console.log(`🧠 Sintetizando respuesta final...`)

    const synthesisResponse = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: synthesisPrompt },
        { 
          role: "user", 
          content: `Sintetiza toda la información recopilada para responder: "${userQuestion}"` 
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      stream: true
    })

    // ═══════════════════════════════════════════════════════════════════════
    // CREAR STREAM DE RESPUESTA
    // ═══════════════════════════════════════════════════════════════════════

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Agregar metadata de investigación al inicio
        const metadata = `> 🔍 **Investigación completada:** ${roundNumber} ronda(s), ${totalSources} fuentes consultadas (${totalOfficial} oficiales)\n\n---\n\n`
        controller.enqueue(encoder.encode(metadata))

        // Streamear respuesta del modelo
        for await (const chunk of synthesisResponse) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            controller.enqueue(encoder.encode(content))
          }
        }

        // Agregar lista de fuentes al final
        const allSources = researchRounds.flatMap(r => r.results)
        const officialSources = allSources.filter(s => s.type === 'official')
        const academicSources = allSources.filter(s => s.type === 'academic')

        let sourcesSection = `\n\n---\n\n## 📚 Fuentes Consultadas\n\n`
        
        if (officialSources.length > 0) {
          sourcesSection += `### 🏛️ Fuentes Oficiales\n`
          // Eliminar duplicados por URL
          const uniqueOfficial = [...new Map(officialSources.map(s => [s.url, s])).values()]
          uniqueOfficial.slice(0, 10).forEach(s => {
            sourcesSection += `- [${s.title}](${s.url})\n`
          })
          sourcesSection += '\n'
        }

        if (academicSources.length > 0) {
          sourcesSection += `### 📚 Fuentes Académicas\n`
          const uniqueAcademic = [...new Map(academicSources.map(s => [s.url, s])).values()]
          uniqueAcademic.slice(0, 5).forEach(s => {
            sourcesSection += `- [${s.title}](${s.url})\n`
          })
        }

        controller.enqueue(encoder.encode(sourcesSection))

        // Tiempo de procesamiento
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
        const footer = `\n\n---\n*⏱️ Tiempo de investigación: ${processingTime}s*`
        controller.enqueue(encoder.encode(footer))

        controller.close()
      }
    })

    console.log(`✅ Streaming respuesta final...`)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Research-Rounds': String(roundNumber),
        'X-Total-Sources': String(totalSources),
        'X-Official-Sources': String(totalOfficial)
      }
    })

  } catch (error: any) {
    console.error(`❌ Error en Tongyi Iterative:`, error)
    
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
 * GET endpoint para verificar estado
 */
export async function GET() {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY)
  const hasSerper = Boolean(process.env.SERPER_API_KEY)

  return NextResponse.json({
    status: "ok",
    endpoint: "Tongyi Iterative Research",
    features: [
      "Búsqueda iterativa hasta 5 rondas",
      "Evaluación automática de suficiencia",
      "Priorización de fuentes oficiales",
      "Síntesis final con citación de fuentes"
    ],
    apiKeys: {
      openrouter: hasOpenRouter ? "✅ Configurada" : "❌ Falta",
      serper: hasSerper ? "✅ Configurada" : "❌ Falta"
    },
    model: "alibaba/tongyi-deepresearch-30b-a3b"
  })
}

