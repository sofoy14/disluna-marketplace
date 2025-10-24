// CONFIRMAR USO ANTES DE ELIMINACIÓN - Orquestador redundante con unified-deep-research-orchestrator.ts
import OpenAI from "openai"
import { searchLegalSpecialized } from "@/lib/tools/legal/legal-search-specialized"
import { extractUrlContent } from "@/lib/tools/web-search"

export interface UnlimitedSearchOptions {
  client: OpenAI
  model: string
  searchTimeoutMs?: number
  maxResultsPerSearch?: number
  enableContentExtraction?: boolean
}

export interface UnlimitedSearchResult {
  originalQuery: string
  totalSearches: number
  totalResults: number
  totalDurationMs: number
  finalContext: string
  searchHistory: Array<{
    query: string
    results: number
    durationMs: number
    timestamp: Date
  }>
  allResults: Array<{
    title: string
    url: string
    snippet: string
    content?: string
    type: 'official' | 'academic' | 'news' | 'general'
    relevance: number
    quality: number
    authority: 'maxima' | 'alta' | 'media' | 'baja' | 'minima'
  }>
}

/**
 * Sistema de búsqueda completamente libre e ilimitada
 * El modelo puede buscar tantas veces como considere necesario
 */
export async function runUnlimitedSearchWorkflow(
  userQuery: string,
  options: UnlimitedSearchOptions
): Promise<UnlimitedSearchResult> {
  const {
    client,
    model,
    searchTimeoutMs = 30000,
    maxResultsPerSearch = 10,
    enableContentExtraction = true
  } = options

  console.log(`\n🌐 INICIANDO BÚSQUEDA LIBRE E ILIMITADA`)
  console.log(`📝 Consulta: "${userQuery}"`)
  console.log(`🎯 Sin límites de rondas o búsquedas`)
  console.log(`⏱️ Timeout por búsqueda: ${searchTimeoutMs}ms`)
  console.log(`${'='.repeat(80)}`)

  const startTime = Date.now()
  const searchHistory: UnlimitedSearchResult['searchHistory'] = []
  const allResults: UnlimitedSearchResult['allResults'] = []
  const executedQueries = new Set<string>()
  let totalSearches = 0

  try {
    // FASE 1: Búsqueda inicial múltiple
    console.log(`\n🔍 FASE 1: BÚSQUEDA INICIAL MÚLTIPLE`)
    const initialQueries = await generateInitialQueries(client, model, userQuery)
    
    for (const query of initialQueries) {
      const queryStart = Date.now()
      console.log(`🔍 Buscando: "${query}"`)
      
      try {
        const searchResult = await searchLegalSpecialized(query, maxResultsPerSearch)
        
        if (searchResult.success && searchResult.results.length > 0) {
          const results = searchResult.results.map(result => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            type: result.type as 'official' | 'academic' | 'news' | 'general',
            relevance: result.relevance,
            quality: result.type === 'official' ? 8 : result.type === 'academic' ? 7 : 6,
            authority: result.type === 'official' ? 'maxima' as const : 
                      result.type === 'academic' ? 'alta' as const : 'media' as const
          }))

          allResults.push(...results)
          totalSearches++
          
          searchHistory.push({
            query,
            results: results.length,
            durationMs: Date.now() - queryStart,
            timestamp: new Date()
          })

          console.log(`✅ "${query}": ${results.length} resultados encontrados`)
        } else {
          console.log(`⚠️ "${query}": sin resultados`)
        }
      } catch (error) {
        console.log(`❌ Error en "${query}":`, error)
      }
      
      executedQueries.add(normalizeQuery(query))
    }

    // FASE 2: Búsqueda iterativa dirigida por el modelo
    console.log(`\n🧠 FASE 2: BÚSQUEDA ITERATIVA DIRIGIDA POR EL MODELO`)
    let iteration = 1
    const maxIterations = 20 // Límite de seguridad muy alto

    while (iteration <= maxIterations) {
      console.log(`\n🔄 ITERACIÓN ${iteration}/${maxIterations}`)
      
      // El modelo evalúa si necesita más información
      const needsMoreInfo = await evaluateInformationNeed(
        client,
        model,
        userQuery,
        allResults,
        searchHistory
      )

      if (!needsMoreInfo.shouldContinue) {
        console.log(`🎯 El modelo considera que tiene información suficiente`)
        console.log(`📊 Calidad: ${needsMoreInfo.quality}/10`)
        console.log(`🎯 Confianza: ${needsMoreInfo.confidence.toFixed(2)}`)
        break
      }

      // Generar nuevas consultas específicas
      const newQueries = await generateSpecificQueries(
        client,
        model,
        userQuery,
        allResults,
        needsMoreInfo.gaps
      )

      // Filtrar consultas ya ejecutadas
      const uniqueQueries = newQueries.filter(query => {
        const normalized = normalizeQuery(query)
        if (executedQueries.has(normalized)) {
          return false
        }
        executedQueries.add(normalized)
        return true
      })

      if (uniqueQueries.length === 0) {
        console.log(`⚠️ No se generaron consultas nuevas`)
        break
      }

      // Ejecutar nuevas búsquedas
      console.log(`🔍 Ejecutando ${uniqueQueries.length} búsquedas adicionales...`)
      
      for (const query of uniqueQueries.slice(0, 5)) { // Máximo 5 por iteración
        const queryStart = Date.now()
        console.log(`🔍 Buscando: "${query}"`)
        
        try {
          const searchResult = await searchLegalSpecialized(query, maxResultsPerSearch)
          
          if (searchResult.success && searchResult.results.length > 0) {
            const results = searchResult.results.map(result => ({
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              type: result.type as 'official' | 'academic' | 'news' | 'general',
              relevance: result.relevance,
              quality: result.type === 'official' ? 8 : result.type === 'academic' ? 7 : 6,
              authority: result.type === 'official' ? 'maxima' as const : 
                        result.type === 'academic' ? 'alta' as const : 'media' as const
            }))

            allResults.push(...results)
            totalSearches++
            
            searchHistory.push({
              query,
              results: results.length,
              durationMs: Date.now() - queryStart,
              timestamp: new Date()
            })

            console.log(`✅ "${query}": ${results.length} resultados encontrados`)
          } else {
            console.log(`⚠️ "${query}": sin resultados`)
          }
        } catch (error) {
          console.log(`❌ Error en "${query}":`, error)
        }
      }

      iteration++
    }

    // FASE 3: Enriquecimiento de contenido
    if (enableContentExtraction) {
      console.log(`\n📄 FASE 3: ENRIQUECIMIENTO DE CONTENIDO`)
      const topResults = allResults
        .sort((a, b) => b.quality - a.quality)
        .slice(0, 15) // Top 15 resultados

      for (const result of topResults) {
        try {
          console.log(`📄 Enriqueciendo: ${result.title}`)
          const content = await extractUrlContent(result.url, { preferFirecrawl: true })
          
          if (content && content.length > 100) {
            result.content = content.slice(0, 3000) // Limitar a 3000 caracteres
            console.log(`✅ Enriquecido: ${result.title} (${content.length} caracteres)`)
          }
        } catch (error) {
          console.log(`❌ Error enriqueciendo ${result.title}:`, error)
        }
      }
    }

    // FASE 4: Síntesis final
    console.log(`\n🧠 FASE 4: SÍNTESIS FINAL`)
    const totalDuration = Date.now() - startTime
    const finalContext = await generateFinalContext(client, model, userQuery, allResults, searchHistory)

    const result: UnlimitedSearchResult = {
      originalQuery: userQuery,
      totalSearches,
      totalResults: allResults.length,
      totalDurationMs: totalDuration,
      finalContext,
      searchHistory,
      allResults: removeDuplicateResults(allResults)
    }

    console.log(`\n🎯 BÚSQUEDA LIBRE COMPLETADA`)
    console.log(`📊 Resumen final:`)
    console.log(`   🔍 Búsquedas totales: ${result.totalSearches}`)
    console.log(`   📄 Resultados totales: ${result.totalResults}`)
    console.log(`   ⏱️ Duración: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log(`   🔄 Iteraciones: ${iteration - 1}`)
    console.log(`${'='.repeat(80)}`)

    return result

  } catch (error) {
    console.error(`❌ Error en búsqueda libre:`, error)
    
    const totalDuration = Date.now() - startTime
    const finalContext = buildErrorContext(userQuery, allResults, searchHistory, error)

    return {
      originalQuery: userQuery,
      totalSearches,
      totalResults: allResults.length,
      totalDurationMs: totalDuration,
      finalContext,
      searchHistory,
      allResults: removeDuplicateResults(allResults)
    }
  }
}

/**
 * Genera consultas iniciales múltiples
 */
async function generateInitialQueries(client: OpenAI, model: string, userQuery: string): Promise<string[]> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Eres un experto en búsqueda legal colombiana. Genera múltiples consultas específicas para encontrar información completa sobre la consulta del usuario.

CONSULTA: "${userQuery}"

Genera al menos 5 consultas diferentes que cubran:
1. Aspectos normativos específicos
2. Jurisprudencia relevante
3. Conceptos oficiales (DIAN, Superintendencias)
4. Doctrina especializada
5. Información actualizada

Responde solo con un array JSON de strings:
["consulta 1", "consulta 2", "consulta 3", "consulta 4", "consulta 5"]`
        },
        {
          role: "user",
          content: `Genera consultas específicas para: "${userQuery}"`
        }
      ],
      temperature: 0.2,
      max_tokens: 800,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || '[]'
    const queries = JSON.parse(content)
    
    return Array.isArray(queries) ? queries.slice(0, 8) : [
      userQuery,
      `${userQuery} Colombia normativa`,
      `${userQuery} jurisprudencia`,
      `${userQuery} concepto DIAN`,
      `${userQuery} doctrina`
    ]
  } catch (error) {
    console.warn(`⚠️ Error generando consultas iniciales:`, error)
    return [
      userQuery,
      `${userQuery} Colombia normativa`,
      `${userQuery} jurisprudencia`,
      `${userQuery} concepto DIAN`,
      `${userQuery} doctrina`
    ]
  }
}

/**
 * Evalúa si necesita más información
 */
async function evaluateInformationNeed(
  client: OpenAI,
  model: string,
  userQuery: string,
  results: UnlimitedSearchResult['allResults'],
  history: UnlimitedSearchResult['searchHistory']
): Promise<{
  shouldContinue: boolean
  confidence: number
  quality: number
  gaps: string[]
}> {
  try {
    const resultsSummary = results.slice(0, 10).map(r => 
      `- ${r.title} (${r.type}, calidad ${r.quality}/10)`
    ).join('\n')

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Eres un evaluador experto de información legal. Analiza si la información recopilada es suficiente para responder completamente la consulta del usuario.

CONSULTA: "${userQuery}"
BÚSQUEDAS REALIZADAS: ${history.length}
RESULTADOS ENCONTRADOS: ${results.length}

RESULTADOS PRINCIPALES:
${resultsSummary}

Evalúa:
1. ¿La información es suficiente para responder completamente?
2. ¿Qué aspectos específicos faltan?
3. ¿La calidad de las fuentes es adecuada?
4. ¿Necesitas más información específica?

Responde en formato JSON:
{
  "shouldContinue": true/false,
  "confidence": 0.0-1.0,
  "quality": 0-10,
  "gaps": ["aspecto faltante 1", "aspecto faltante 2"]
}`
        },
        {
          role: "user",
          content: `Evalúa si necesito más información para: "${userQuery}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 600,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || '{}'
    const evaluation = JSON.parse(content)
    
    return {
      shouldContinue: evaluation.shouldContinue !== false,
      confidence: evaluation.confidence || 0.5,
      quality: evaluation.quality || 5,
      gaps: evaluation.gaps || []
    }
  } catch (error) {
    console.warn(`⚠️ Error evaluando necesidad de información:`, error)
    return {
      shouldContinue: true,
      confidence: 0.3,
      quality: 3,
      gaps: ['Información adicional necesaria']
    }
  }
}

/**
 * Genera consultas específicas basadas en brechas identificadas
 */
async function generateSpecificQueries(
  client: OpenAI,
  model: string,
  userQuery: string,
  results: UnlimitedSearchResult['allResults'],
  gaps: string[]
): Promise<string[]> {
  try {
    const gapsText = gaps.join(', ')
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Eres un experto en búsqueda legal. Genera consultas específicas para llenar las brechas identificadas.

CONSULTA ORIGINAL: "${userQuery}"
BRECHAS IDENTIFICADAS: ${gapsText}

Genera consultas específicas que busquen información sobre estos aspectos faltantes.

Responde solo con un array JSON de strings:
["consulta específica 1", "consulta específica 2", "consulta específica 3"]`
        },
        {
          role: "user",
          content: `Genera consultas para llenar: ${gapsText}`
        }
      ],
      temperature: 0.2,
      max_tokens: 500,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || '[]'
    const queries = JSON.parse(content)
    
    return Array.isArray(queries) ? queries.slice(0, 5) : []
  } catch (error) {
    console.warn(`⚠️ Error generando consultas específicas:`, error)
    return gaps.map(gap => `${userQuery} ${gap}`)
  }
}

/**
 * Genera contexto final
 */
async function generateFinalContext(
  client: OpenAI,
  model: string,
  userQuery: string,
  results: UnlimitedSearchResult['allResults'],
  history: UnlimitedSearchResult['searchHistory']
): Promise<string> {
  try {
    const resultsText = results.slice(0, 15).map((result, index) => 
      `FUENTE ${index + 1} [${result.type.toUpperCase()}] [Calidad: ${result.quality}/10]\n` +
      `Título: ${result.title}\n` +
      `URL: ${result.url}\n` +
      `Resumen: ${result.snippet}\n` +
      `Autoridad: ${result.authority}\n` +
      (result.content ? `Contenido: ${result.content.substring(0, 800)}...\n` : '') +
      `---`
    ).join('\n\n')

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Eres un sintetizador jurídico experto. Con base en toda la información recopilada, genera un contexto completo y estructurado.

CONSULTA: "${userQuery}"
BÚSQUEDAS REALIZADAS: ${history.length}
RESULTADOS ENCONTRADOS: ${results.length}

INFORMACIÓN RECOPILADA:
${resultsText}

Genera un contexto estructurado que incluya:
1. Marco normativo relevante
2. Jurisprudencia aplicable
3. Conceptos oficiales
4. Doctrina especializada
5. Información actualizada
6. Fuentes verificadas

Sé exhaustivo y preciso.`
        },
        {
          role: "user",
          content: `Genera contexto para: "${userQuery}"`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      stream: false
    })

    const synthesis = response.choices?.[0]?.message?.content || "Error en síntesis"

    return [
      "## BÚSQUEDA LIBRE COMPLETADA - CONTEXTO EXHAUSTIVO",
      `Consulta original: "${userQuery}"`,
      `Búsquedas realizadas: ${history.length}`,
      `Resultados encontrados: ${results.length}`,
      `Calidad promedio: ${(results.reduce((sum, r) => sum + r.quality, 0) / results.length).toFixed(1)}/10`,
      "",
      "## CONTEXTO JURÍDICO COMPLETO",
      synthesis,
      "",
      "## FUENTES VERIFICADAS COMPLETAS",
      resultsText,
      "",
      "## INSTRUCCIONES FINALES",
      "- Utiliza exclusivamente la información de las fuentes verificadas",
      "- Verifica la vigencia y jerarquía de cada norma",
      "- Proporciona una respuesta completa y precisa",
      "- Incluye citas exactas y enlaces a fuentes oficiales",
      "- Si hay contradicciones, explícalas claramente"
    ].join('\n')
  } catch (error) {
    console.warn(`⚠️ Error generando contexto final:`, error)
    return buildErrorContext(userQuery, results, history, error)
  }
}

/**
 * Construye contexto de error
 */
function buildErrorContext(
  userQuery: string,
  results: UnlimitedSearchResult['allResults'],
  history: UnlimitedSearchResult['searchHistory'],
  error: any
): string {
  const resultsText = results.slice(0, 5).map((result, index) => 
    `FUENTE ${index + 1}: ${result.title} (${result.url})`
  ).join('\n')

  return [
    "## BÚSQUEDA LIBRE INCOMPLETA (ERROR)",
    `Consulta original: "${userQuery}"`,
    `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    `Búsquedas completadas: ${history.length}`,
    `Resultados parciales: ${results.length}`,
    "",
    "## RESULTADOS PARCIALES",
    resultsText,
    "",
    "## INSTRUCCIONES",
    "- Usa los resultados disponibles con precaución",
    "- Verifica manualmente cada fuente",
    "- Indica qué información no pudo ser verificada",
    "- Sugiere consultar fuentes oficiales directamente"
  ].join('\n')
}

/**
 * Funciones utilitarias
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim()
}

function removeDuplicateResults(results: UnlimitedSearchResult['allResults']): UnlimitedSearchResult['allResults'] {
  const seen = new Set<string>()
  return results.filter(result => {
    const key = result.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

