import OpenAI from "openai"
import { searchLegalSpecialized, enrichLegalResults } from "@/lib/tools/legal/legal-search-specialized"
import { extractUrlContent } from "@/lib/tools/web-search"
import { 
  DYNAMIC_SEARCH_DECISION_PROMPT,
  DYNAMIC_SEARCH_EVALUATION_PROMPT,
  DYNAMIC_SEARCH_STRATEGY_PROMPT,
  DYNAMIC_SEARCH_SYNTHESIS_PROMPT
} from "./dynamic-search-prompts"

export interface DynamicSearchOptions {
  client: OpenAI
  model: string
  maxSearchRounds?: number
  maxSearchesPerRound?: number
  searchTimeoutMs?: number
  enableModelDecision?: boolean
}

export interface SearchDecision {
  shouldContinue: boolean
  confidence: number
  reasoning: string
  nextQueries?: Array<{
    query: string
    type: 'normativa' | 'jurisprudencia' | 'doctrina' | 'actualidad' | 'general'
    priority: 'alta' | 'media' | 'baja'
    reason: string
  }>
  qualityAssessment: {
    completeness: number
    accuracy: number
    relevance: number
    authority: number
    overall: number
  }
}

export interface SearchRound {
  roundNumber: number
  queries: string[]
  results: SearchResult[]
  decision: SearchDecision
  durationMs: number
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
  type: 'official' | 'academic' | 'news' | 'general'
  relevance: number
  quality: number
  authority: 'maxima' | 'alta' | 'media' | 'baja' | 'minima'
  currency: 'actualizada' | 'desactualizada' | 'desconocida'
  recommendedUse: 'cita_principal' | 'secundaria' | 'contextual' | 'no_usar'
}

export interface DynamicSearchResult {
  originalQuery: string
  rounds: SearchRound[]
  allResults: SearchResult[]
  finalContext: string
  metadata: {
    totalRounds: number
    totalSearches: number
    totalResults: number
    totalDurationMs: number
    finalQuality: number
    modelDecisions: number
    searchStrategy: string
  }
}

class SearchTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SearchTimeoutError"
  }
}

/**
 * Sistema de búsqueda dinámico donde el modelo decide autónomamente cuántas veces buscar
 * El modelo evalúa la calidad de la información y decide si necesita más búsquedas
 */
export async function runDynamicSearchWorkflow(
  userQuery: string,
  options: DynamicSearchOptions
): Promise<DynamicSearchResult> {
  const {
    client,
    model,
    maxSearchRounds = 10, // Aumentado para permitir más rondas
    maxSearchesPerRound = 8, // Aumentado para más búsquedas por ronda
    searchTimeoutMs = 45000, // Aumentado a 45 segundos
    enableModelDecision = true
  } = options

  console.log(`\n🧠 INICIANDO BÚSQUEDA DINÁMICA INTELIGENTE`)
  console.log(`📝 Consulta: "${userQuery}"`)
  console.log(`🎯 Máximo de rondas: ${maxSearchRounds}`)
  console.log(`🔍 Búsquedas por ronda: ${maxSearchesPerRound}`)
  console.log(`⏱️ Timeout por búsqueda: ${searchTimeoutMs}ms`)
  console.log(`🤖 Decisión del modelo: ${enableModelDecision ? 'ACTIVADA' : 'DESACTIVADA'}`)
  console.log(`${'='.repeat(80)}`)

  const startTime = Date.now()
  const rounds: SearchRound[] = []
  let allResults: SearchResult[] = []
  let modelDecisions = 0
  const executedQueries = new Set<string>()

  try {
    // FASE 1: Análisis inicial y planificación
    console.log(`\n🧠 FASE 1: ANÁLISIS INICIAL Y PLANIFICACIÓN`)
    const initialStrategy = await planSearchStrategy(client, model, userQuery)
    console.log(`📋 Estrategia inicial: ${initialStrategy.strategy}`)
    console.log(`🎯 Consultas planificadas: ${initialStrategy.queries.length}`)
    
    // FASE 2: Ejecución dinámica dirigida por el modelo
    console.log(`\n🧠 FASE 2: EJECUCIÓN DINÁMICA DIRIGIDA POR EL MODELO`)
    
    for (let round = 1; round <= maxSearchRounds; round++) {
      console.log(`\n🔍 RONDA ${round} DE BÚSQUEDA DINÁMICA`)
      const roundStart = Date.now()
      
      // Generar consultas para esta ronda
      let queries: string[] = []
      
      if (round === 1) {
        // Primera ronda: usar consultas del plan inicial
        queries = initialStrategy.queries.slice(0, maxSearchesPerRound)
        console.log(`📋 Usando ${queries.length} consultas del plan inicial`)
      } else {
        // Rondas subsiguientes: el modelo decide qué buscar
        const lastRound = rounds[rounds.length - 1]
        if (lastRound?.decision.nextQueries && lastRound.decision.nextQueries.length > 0) {
          queries = lastRound.decision.nextQueries
            .filter(q => q.priority === 'alta' || q.priority === 'media')
            .slice(0, maxSearchesPerRound)
            .map(q => q.query)
          console.log(`🧠 Modelo decidió ${queries.length} consultas adicionales`)
          modelDecisions++
        }
        
        // Si no hay consultas del modelo, generar automáticas
        if (queries.length === 0) {
          queries = await generateAdaptiveQueries(client, model, userQuery, allResults, rounds)
          console.log(`🔄 Generadas ${queries.length} consultas adaptativas`)
        }
      }

      // Filtrar consultas ya ejecutadas
      queries = queries
        .map(q => q.trim())
        .filter(q => q.length > 0)
        .filter(q => {
          const key = normalizeQueryKey(q)
          if (executedQueries.has(key)) {
            return false
          }
          executedQueries.add(key)
          return true
        })

      if (queries.length === 0) {
        console.log(`⚠️ No se generaron consultas nuevas para ronda ${round}`)
        break
      }

      // Ejecutar búsquedas
      console.log(`🔍 Ejecutando ${queries.length} búsquedas especializadas...`)
      const roundResults = await executeSearchRound(queries, maxSearchesPerRound, searchTimeoutMs)
      
      // Enriquecer resultados con contenido completo
      console.log(`📄 Enriqueciendo ${roundResults.length} resultados con contenido completo...`)
      const enrichedResults = await enrichSearchResults(roundResults)
      
      allResults = [...allResults, ...enrichedResults]
      
      // Eliminar duplicados y mantener solo los mejores
      allResults = removeDuplicateResults(allResults)
      allResults = allResults.sort((a, b) => b.quality - a.quality).slice(0, 25) // Máximo 25 resultados
      
      // DECISIÓN CRÍTICA: El modelo evalúa si necesita más información
      console.log(`🧠 El modelo evalúa si necesita más información...`)
      const decision = await evaluateSearchDecision(
        client, 
        model, 
        userQuery, 
        allResults, 
        rounds
      )

      const roundDuration = Date.now() - roundStart

      const searchRound: SearchRound = {
        roundNumber: round,
        queries,
        results: enrichedResults,
        decision,
        durationMs: roundDuration
      }

      rounds.push(searchRound)
      
      console.log(`✅ Ronda ${round} completada en ${roundDuration}ms`)
      console.log(`📊 Resultados: ${enrichedResults.length} | Calidad promedio: ${enrichedResults.length > 0 ? (enrichedResults.reduce((sum, r) => sum + r.quality, 0) / enrichedResults.length).toFixed(1) : 0}/10`)
      console.log(`🧠 Decisión del modelo: ${decision.shouldContinue ? 'CONTINUAR' : 'FINALIZAR'}`)
      console.log(`📈 Confianza: ${decision.confidence.toFixed(2)}`)
      console.log(`🎯 Calidad general: ${decision.qualityAssessment.overall}/10`)
      
      if (decision.reasoning) {
        console.log(`💭 Razonamiento: ${decision.reasoning}`)
      }

      // CRITERIO DE PARADA: El modelo decide si tiene suficiente información
      // Solo parar si el modelo está MUY seguro (confianza >= 0.9) Y calidad >= 8
      if (!decision.shouldContinue && decision.confidence >= 0.9 && decision.qualityAssessment.overall >= 8) {
        console.log(`🎯 El modelo considera que tiene información suficiente`)
        console.log(`📊 Calidad general: ${decision.qualityAssessment.overall}/10`)
        console.log(`🎯 Confianza: ${decision.confidence.toFixed(2)}`)
        break
      }

      // Criterios de seguridad más permisivos para permitir más búsquedas
      if (round >= 6 && decision.qualityAssessment.overall >= 9) {
        console.log(`🛡️ Calidad muy alta alcanzada (${decision.qualityAssessment.overall}/10), finalizando`)
        break
      }

      if (round >= 8 && allResults.length >= 30) {
        console.log(`🛡️ Muchos resultados (${allResults.length}), finalizando`)
        break
      }
    }

    // FASE 3: Síntesis final inteligente
    console.log(`\n🧠 FASE 3: SÍNTESIS FINAL INTELIGENTE`)
    const totalDuration = Date.now() - startTime
    
    // Generar contexto final con síntesis experta
    const finalContext = await generateFinalSynthesis(client, model, userQuery, allResults, rounds)
    
    const finalQuality = calculateOverallQuality(rounds, allResults)
    const searchStrategy = determineSearchStrategy(rounds, allResults)

    const result: DynamicSearchResult = {
      originalQuery: userQuery,
      rounds,
      allResults,
      finalContext,
      metadata: {
        totalRounds: rounds.length,
        totalSearches: rounds.reduce((sum, round) => sum + round.queries.length, 0),
        totalResults: allResults.length,
        totalDurationMs: totalDuration,
        finalQuality,
        modelDecisions,
        searchStrategy
      }
    }

    console.log(`\n🎯 BÚSQUEDA DINÁMICA COMPLETADA`)
    console.log(`📊 Resumen final:`)
    console.log(`   🔍 Rondas: ${result.metadata.totalRounds}/${maxSearchRounds}`)
    console.log(`   🔍 Búsquedas: ${result.metadata.totalSearches}`)
    console.log(`   📄 Resultados: ${result.metadata.totalResults}`)
    console.log(`   🎯 Calidad final: ${result.metadata.finalQuality}/10`)
    console.log(`   🧠 Decisiones del modelo: ${result.metadata.modelDecisions}`)
    console.log(`   ⏱️ Duración: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log(`   📋 Estrategia: ${result.metadata.searchStrategy}`)
    console.log(`${'='.repeat(80)}`)

    return result

  } catch (error) {
    console.error(`❌ Error en búsqueda dinámica:`, error)
    
    // Retornar resultado parcial mejorado
    const totalDuration = Date.now() - startTime
    const finalContext = await generateErrorSynthesis(client, model, userQuery, rounds, allResults, error)
    
    return {
      originalQuery: userQuery,
      rounds,
      allResults,
      finalContext,
      metadata: {
        totalRounds: rounds.length,
        totalSearches: rounds.reduce((sum, round) => sum + round.queries.length, 0),
        totalResults: allResults.length,
        totalDurationMs: totalDuration,
        finalQuality: Math.max(1, calculateOverallQuality(rounds, allResults) - 2),
        modelDecisions,
        searchStrategy: "ERROR_PARCIAL_MEJORADO"
      }
    }
  }
}

/**
 * Planificación estratégica inicial
 */
async function planSearchStrategy(client: OpenAI, model: string, query: string) {
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: DYNAMIC_SEARCH_STRATEGY_PROMPT },
        { role: "user", content: `CONSULTA DEL USUARIO: "${query}"` }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || '{}'
    const strategy = parseSearchStrategy(content)
    
    // Garantizar número mínimo de consultas
    if (strategy.queries.length < 3) {
      strategy.queries = [
        query,
        `${query} Colombia normativa`,
        `${query} jurisprudencia Corte Constitucional`
      ]
    }
    
    return strategy
  } catch (error) {
    console.warn(`⚠️ Error planificando estrategia:`, error)
    return {
      strategy: "Búsqueda general adaptativa",
      queries: [
        query,
        `${query} Colombia ley`,
        `${query} jurisprudencia`,
        `${query} concepto DIAN`
      ],
      rationale: "Plan generado por error en planificación inicial"
    }
  }
}

/**
 * Evaluación de decisión de búsqueda por el modelo
 */
async function evaluateSearchDecision(
  client: OpenAI,
  model: string,
  originalQuery: string,
  results: SearchResult[],
  previousRounds: SearchRound[]
): Promise<SearchDecision> {
  try {
    const context = buildDecisionContext(originalQuery, results, previousRounds)
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: DYNAMIC_SEARCH_DECISION_PROMPT },
        { role: "user", content: context }
      ],
      temperature: 0.1,
      max_tokens: 1200,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || '{}'
    const decision = parseSearchDecision(content)
    
    return decision
  } catch (error) {
    console.warn(`⚠️ Error evaluando decisión:`, error)
    return {
      shouldContinue: true, // En caso de error, continuar buscando por seguridad
      confidence: 0.2,
      reasoning: "Error en evaluación de decisión - continuando por seguridad",
      qualityAssessment: {
        completeness: 2, // Muy bajo para forzar más búsquedas
        accuracy: 2,
        relevance: 2,
        authority: 2,
        overall: 2
      }
    }
  }
}

/**
 * Generación de consultas adaptativas
 */
async function generateAdaptiveQueries(
  client: OpenAI, 
  model: string, 
  originalQuery: string, 
  results: SearchResult[], 
  previousRounds: SearchRound[]
): Promise<string[]> {
  try {
    const context = buildQueryGenerationContext(originalQuery, results, previousRounds)
    
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: DYNAMIC_SEARCH_EVALUATION_PROMPT },
        { role: "user", content: context }
      ],
      temperature: 0.2,
      max_tokens: 800,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || '{"queries":[]}'
    const parsed = parseQueryGeneration(content)
    
    return parsed.queries.slice(0, 6)
  } catch (error) {
    console.warn(`⚠️ Error generando consultas adaptativas:`, error)
    return [
      `${originalQuery} Colombia normativa reciente`,
      `${originalQuery} jurisprudencia actual`,
      `${originalQuery} doctrina especializada`
    ]
  }
}

/**
 * Ejecución de ronda de búsqueda
 */
async function executeSearchRound(
  queries: string[], 
  maxResults: number, 
  timeoutMs: number
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  for (const query of queries) {
    try {
      console.log(`🔍 Buscando: "${query}"`)
      const searchResult = await withTimeout(
        searchLegalSpecialized(query, Math.max(maxResults, 6)),
        timeoutMs
      )

      if (searchResult.success && searchResult.results.length > 0) {
        const sources = searchResult.results.map(result => {
          const authority: SearchResult['authority'] =
            result.type === 'official' ? 'maxima' :
            result.type === 'academic' ? 'alta' :
            result.type === 'news' ? 'media' : 'baja'
          const recommendedUse: SearchResult['recommendedUse'] =
            result.type === 'official' ? 'cita_principal' :
            result.type === 'academic' ? 'secundaria' :
            result.type === 'news' ? 'contextual' : 'contextual'
          const baselineQuality =
            result.type === 'official' ? 8 :
            result.type === 'academic' ? 7 :
            result.type === 'news' ? 6 : 5

          return {
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            type: result.type,
            relevance: result.relevance,
            quality: baselineQuality,
            authority,
            currency: 'desconocida' as const,
            recommendedUse
          }
        })

        results.push(...sources)
        const officialCount = sources.filter(source => source.type === 'official').length
        console.log(`✅ "${query}": ${sources.length} fuentes encontradas (${officialCount} oficiales)`)
      } else {
        console.log(`⚠️ "${query}": sin resultados en la búsqueda especializada`)
      }
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        console.log(`⏱️ Timeout en búsqueda: "${query}"`)
      } else {
        console.log(`❌ Fallo en búsqueda "${query}":`, error)
      }
    }
  }

  // Eliminar duplicados y priorizar mayor relevancia
  const uniqueResults = removeDuplicateResults(results)
  return uniqueResults.sort((a, b) => b.relevance - a.relevance)
}

/**
 * Enriquecimiento de resultados con contenido completo
 */
async function enrichSearchResults(results: SearchResult[]): Promise<SearchResult[]> {
  const enrichedResults: SearchResult[] = []

  for (const result of results.slice(0, 10)) { // Limitar a 10 para evitar sobrecarga
    try {
      console.log(`📄 Enriqueciendo: ${result.title}`)
      const content = await extractUrlContent(result.url, { preferFirecrawl: true })
      
      if (content && content.length > 100) {
        enrichedResults.push({
          ...result,
          content: content.slice(0, 2000) // Limitar contenido a 2000 caracteres
        })
        console.log(`✅ Enriquecido: ${result.title} (${content.length} caracteres)`)
      } else {
        enrichedResults.push(result)
        console.log(`⚠️ Sin contenido enriquecido: ${result.title}`)
      }
    } catch (error) {
      enrichedResults.push(result)
      console.log(`❌ Error enriqueciendo ${result.title}:`, error)
    }
  }

  return enrichedResults
}

/**
 * Generación de síntesis final
 */
async function generateFinalSynthesis(
  client: OpenAI,
  model: string,
  query: string,
  results: SearchResult[],
  rounds: SearchRound[]
): Promise<string> {
  try {
    const resultsText = results.map((result, index) => 
      `FUENTE ${index + 1} [${result.type.toUpperCase()}] [Calidad: ${result.quality}/10]\n` +
      `Título: ${result.title}\n` +
      `URL: ${result.url}\n` +
      `Resumen: ${result.snippet}\n` +
      `Autoridad: ${result.authority} | Vigencia: ${result.currency}\n` +
      `Uso recomendado: ${result.recommendedUse}\n` +
      (result.content ? `Contenido: ${result.content.substring(0, 500)}...\n` : '') +
      `---`
    ).join('\n\n')

    const roundsSummary = rounds.map(round => 
      `Ronda ${round.roundNumber}: ${round.queries.length} búsquedas, ${round.results.length} resultados, decisión: ${round.decision.shouldContinue ? 'CONTINUAR' : 'FINALIZAR'}`
    ).join(' | ')

    const synthesisPrompt = DYNAMIC_SEARCH_SYNTHESIS_PROMPT.replace(
      '{originalQuery}',
      query
    ).replace(
      '{verifiedInfo}',
      resultsText
    ).replace(
      '{mainSources}',
      results.filter(r => r.quality >= 7).slice(0, 5).map((r, i) => `${i+1}. ${r.title} (${r.url})`).join('\n')
    )

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: synthesisPrompt },
        { role: "user", content: `Genera la síntesis final para la consulta: "${query}"` }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      stream: false
    })

    const synthesis = response.choices?.[0]?.message?.content || "Error en síntesis automática"

    return [
      "## BÚSQUEDA DINÁMICA COMPLETADA - SÍNTESIS INTELIGENTE",
      `Consulta original: "${query}"`,
      `Estrategia: ${roundsSummary}`,
      `Resultados totales: ${results.length} (${results.filter(r => r.quality >= 7).length} de alta calidad)`,
      `Calidad promedio: ${(results.reduce((sum, r) => sum + r.quality, 0) / results.length).toFixed(1)}/10`,
      "",
      "## SÍNTESIS INTELIGENTE",
      synthesis,
      "",
      "## FUENTES VERIFICADAS COMPLETAS",
      resultsText,
      "",
      "## INSTRUCCIONES FINALES PARA RESPUESTA",
      "- Utiliza exclusivamente la información de las fuentes verificadas proporcionadas",
      "- Verifica la vigencia y jerarquía de cada norma citada",
      "- Proporciona una respuesta completa, precisa y bien estructurada",
      "- Incluye citas exactas y enlaces a fuentes oficiales",
      "- Si detectas contradicciones, explícalas claramente",
      "- Admite cuando la información sea insuficiente para algún aspecto específico"
    ].join('\n')
  } catch (error) {
    console.warn(`⚠️ Error en síntesis final:`, error)
    return buildFallbackContext(query, rounds, results)
  }
}

/**
 * Síntesis para casos de error
 */
async function generateErrorSynthesis(
  client: OpenAI,
  model: string,
  query: string,
  rounds: SearchRound[],
  results: SearchResult[],
  error: any
): Promise<string> {
  try {
    const resultsText = results.slice(0, 5).map((result, index) => 
      `FUENTE ${index + 1}: ${result.title} (${result.url}) [Calidad: ${result.quality}/10]`
    ).join('\n')

    return [
      "## BÚSQUEDA DINÁMICA INCOMPLETA (ERROR)",
      `Consulta original: "${query}"`,
      `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      `Rondas completadas: ${rounds.length}`,
      `Resultados parciales: ${results.length}`,
      "",
      "## RESULTADOS PARCIALES RECOPILADOS",
      resultsText,
      "",
      "## INSTRUCCIONES PARA RESPUESTA",
      "- La búsqueda fue interrumpida por un error técnico",
      "- Usa los resultados disponibles con extrema precaución",
      "- Verifica manualmente cada fuente antes de citarla",
      "- Indica claramente qué información no pudo ser verificada",
      "- Sugiere al usuario consultar fuentes oficiales directamente",
      "- Recomienda realizar búsquedas adicionales si la información es insuficiente"
    ].join('\n')
  } catch (error) {
    return buildFallbackContext(query, rounds, results)
  }
}

/**
 * Contexto fallback mejorado
 */
function buildFallbackContext(query: string, rounds: SearchRound[], results: SearchResult[]): string {
  const resultsText = results.slice(0, 5).map((result, index) => 
    `FUENTE ${index + 1}: ${result.title} (${result.url})`
  ).join('\n')

  return [
    "## BÚSQUEDA DINÁMICA - RESULTADOS PARCIALES",
    `Consulta: "${query}"`,
    `Rondas: ${rounds.length}`,
    `Resultados: ${results.length}`,
    "",
    "## FUENTES DISPONIBLES",
    resultsText,
    "",
    "## INSTRUCCIONES",
    "- Usa las fuentes disponibles con precaución",
    "- Verifica la vigencia de las normas",
    "- Indica claramente la información limitada"
  ].join('\n')
}

/**
 * Funciones utilitarias
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new SearchTimeoutError(`Operación excedió ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutHandle!)
  }
}

function removeDuplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter(result => {
    const key = result.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateOverallQuality(rounds: SearchRound[], results: SearchResult[]): number {
  if (results.length === 0) return 1
  
  const avgResultQuality = results.reduce((sum, r) => sum + r.quality, 0) / results.length
  const lastDecision = rounds[rounds.length - 1]?.decision.qualityAssessment.overall || 5
  const diversityBonus = Math.min(2, new Set(results.map(r => r.type)).size * 0.5)
  const highQualityBonus = Math.min(2, results.filter(r => r.quality >= 8).length * 0.3)
  
  return Math.round(Math.min(10, (avgResultQuality * 0.4) + (lastDecision * 0.3) + diversityBonus + highQualityBonus))
}

function determineSearchStrategy(rounds: SearchRound[], results: SearchResult[]): string {
  if (results.length === 0) return "SIN_RESULTADOS"
  if (rounds.length === 1) return "BÚSQUEDA_DIRECTA"
  if (rounds.length <= 3) return "BÚSQUEDA_ESTÁNDAR"
  if (results.filter(r => r.quality >= 8).length >= 5) return "BÚSQUEDA_EXHAUSTIVA_ALTA_CALIDAD"
  return "BÚSQUEDA_EXHAUSTIVA"
}

function normalizeQueryKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim()
}

function buildDecisionContext(query: string, results: SearchResult[], rounds: SearchRound[]): string {
  const resultsByQuality = {
    alta: results.filter(r => r.quality >= 8).length,
    media: results.filter(r => r.quality >= 6 && r.quality < 8).length,
    baja: results.filter(r => r.quality < 6).length
  }

  const resultsByType = categorizeResultsByType(results)
  const lastDecision = rounds[rounds.length - 1]?.decision

  return [
    `CONSULTA ORIGINAL: "${query}"`,
    `RONDAS COMPLETADAS: ${rounds.length}`,
    `RESULTADOS TOTALES: ${results.length}`,
    '',
    'DISTRIBUCIÓN POR CALIDAD:',
    `- Alta calidad (>=8): ${resultsByQuality.alta}`,
    `- Media calidad (6-7): ${resultsByQuality.media}`,
    `- Baja calidad (<6): ${resultsByQuality.baja}`,
    '',
    'DISTRIBUCIÓN POR TIPO:',
    Object.entries(resultsByType).map(([type, count]) => `- ${type}: ${count}`).join('\n'),
    '',
    'RESULTADOS ESPECÍFICOS:',
    results.map(r => `- ${r.title} (${r.type}, calidad ${r.quality}/10, autoridad: ${r.authority})`).join('\n'),
    '',
    lastDecision ? `ÚLTIMA DECISIÓN: ${lastDecision.shouldContinue ? 'CONTINUAR' : 'FINALIZAR'} (confianza: ${lastDecision.confidence})` : 'Sin decisión previa',
    '',
    'Evalúa si esta información es suficiente para responder COMPLETAMENTE la consulta original y decide si necesitas más búsquedas.'
  ].filter(line => line.trim()).join('\n')
}

function buildQueryGenerationContext(query: string, results: SearchResult[], rounds: SearchRound[]): string {
  const resultsSummary = results.map(r => `- ${r.title} (${r.type}, calidad ${r.quality}/10)`).join('\n')
  const roundsInfo = rounds.map(r => `Ronda ${r.roundNumber}: ${r.queries.join(', ')}`).join('\n')
  const lastDecision = rounds[rounds.length - 1]?.decision
  
  return [
    `CONSULTA ORIGINAL: "${query}"`,
    `RONDAS COMPLETADAS: ${rounds.length}`,
    `RESULTADOS ENCONTRADOS: ${results.length}`,
    `CALIDAD PROMEDIO: ${results.length > 0 ? (results.reduce((sum, r) => sum + r.quality, 0) / results.length).toFixed(1) : 0}/10`,
    "",
    "RESULTADOS ACTUALES:",
    resultsSummary,
    "",
    "BÚSQUEDAS ANTERIORES:",
    roundsInfo,
    "",
    "ÚLTIMA DECISIÓN:",
    lastDecision ? `Continuar: ${lastDecision.shouldContinue ? 'SÍ' : 'NO'}, Confianza: ${lastDecision.confidence}` : "Sin decisión previa",
    "",
    lastDecision?.reasoning ? "RAZONAMIENTO:\n" + lastDecision.reasoning : "",
    "",
    "Basado en esta información, genera nuevas consultas específicas para mejorar la calidad de la respuesta."
  ].filter(line => line.trim()).join('\n')
}

function categorizeResultsByType(results: SearchResult[]): Record<string, number> {
  const categories: Record<string, number> = {}
  results.forEach(result => {
    categories[result.type] = (categories[result.type] || 0) + 1
  })
  return categories
}

function parseSearchStrategy(content: string) {
  try {
    const jsonText = extractJson(content)
    const parsed = JSON.parse(jsonText)
    
    return {
      strategy: parsed.strategy || "Búsqueda general adaptativa",
      queries: parsed.queries || [],
      rationale: parsed.rationale || "Plan generado automáticamente"
    }
  } catch (error) {
    console.warn("Error parsing search strategy:", error)
    return {
      strategy: "Búsqueda general adaptativa",
      queries: [],
      rationale: "Error en parsing, usando valores por defecto"
    }
  }
}

function parseSearchDecision(content: string) {
  try {
    const jsonText = extractJson(content)
    const parsed = JSON.parse(jsonText)
    
    // Ser más conservador: si no hay decisión clara, continuar buscando
    const shouldContinue = parsed.shouldContinue !== false // Default a true si no está especificado
    const confidence = parsed.confidence || 0.3 // Default más bajo para ser más conservador
    
    return {
      shouldContinue,
      confidence,
      reasoning: parsed.reasoning || "Sin razonamiento proporcionado - continuando por defecto",
      nextQueries: parsed.nextQueries || [],
      qualityAssessment: parsed.qualityAssessment || {
        completeness: 3, // Default más bajo para ser más conservador
        accuracy: 3,
        relevance: 3,
        authority: 3,
        overall: 3
      }
    }
  } catch (error) {
    console.warn("Error parsing search decision:", error)
    return {
      shouldContinue: true, // En caso de error, continuar buscando
      confidence: 0.2,
      reasoning: "Error en parsing de decisión - continuando por seguridad",
      nextQueries: [],
      qualityAssessment: {
        completeness: 2, // Muy bajo para forzar más búsquedas
        accuracy: 2,
        relevance: 2,
        authority: 2,
        overall: 2
      }
    }
  }
}

function parseQueryGeneration(content: string) {
  try {
    const jsonText = extractJson(content)
    return JSON.parse(jsonText)
  } catch (error) {
    console.warn("Error parsing query generation:", error)
    return { 
      queries: [],
      rationale: "Error en parsing" 
    }
  }
}

function extractJson(content: string): string {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON no encontrado en el contenido")
  }
  return content.slice(start, end + 1)
}
