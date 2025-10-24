import OpenAI from "openai"
import { executeEnhancedSearch, EnhancedSearchResult } from "@/lib/tools/enhanced-search-orchestrator"
import { ChatMemoryManager } from "@/lib/memory/chat-memory-manager"
import { createAntiHallucinationSystem } from "@/lib/anti-hallucination/anti-hallucination-system"

export interface TongyiAgentDecision {
  action: 'search' | 'respond' | 'clarify' | 'follow_up'
  confidence: number
  reasoning: string
  searchStrategy?: {
    maxRounds: number
    maxResultsPerRound: number
    prioritizeOfficial: boolean
    prioritizeAcademic: boolean
    prioritizeFreshness: boolean
  }
  responseStrategy?: {
    includeSources: boolean
    includeAnalysis: boolean
    includeRecommendations: boolean
    includeWarnings: boolean
  }
  nextSteps?: string[]
}

export interface TongyiAgentContext {
  userQuery: string
  conversationHistory: any[]
  searchHistory: any[]
  userPreferences: {
    preferredDetailLevel: 'brief' | 'detailed' | 'comprehensive'
    preferredSources: 'official' | 'academic' | 'mixed'
    enableAnalysis: boolean
    enableRecommendations: boolean
  }
  currentSearchResults: EnhancedSearchResult[]
  previousDecisions: TongyiAgentDecision[]
}

export interface TongyiAgentResponse {
  content: string
  sources: Array<{
    title: string
    url: string
    type: string
    quality: number
    relevance: number
  }>
  analysis?: {
    completeness: number
    accuracy: number
    relevance: number
    authority: number
    overall: number
  }
  recommendations?: string[]
  warnings?: string[]
  metadata: {
    searchRounds: number
    totalSources: number
    processingTime: number
    modelDecisions: number
    confidence: number
  }
}

/**
 * Agente Tongyi 30B con capacidades agénticas maximizadas
 * Implementa toma de decisiones autónoma, búsquedas inteligentes y respuestas de alta calidad
 */
export class TongyiAgent {
  private client: OpenAI
  private memoryManager: ChatMemoryManager
  private antiHallucinationSystem: any
  private modelName: string = 'alibaba/tongyi-deepresearch-30b-a3b'

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
    this.memoryManager = ChatMemoryManager.getInstance()
    this.antiHallucinationSystem = createAntiHallucinationSystem(apiKey)
  }

  /**
   * Procesa una consulta del usuario con capacidades agénticas completas
   */
  async processQuery(
    userQuery: string,
    chatId: string,
    userId: string,
    options?: {
      maxSearchRounds?: number
      enableAnalysis?: boolean
      enableRecommendations?: boolean
      preferredDetailLevel?: 'brief' | 'detailed' | 'comprehensive'
    }
  ): Promise<TongyiAgentResponse> {
    const startTime = Date.now()
    
    console.log(`\n🤖 TONGYI AGENT 30B - PROCESAMIENTO AGÉNTICO`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`💬 Chat ID: ${chatId}`)
    console.log(`👤 User ID: ${userId}`)
    console.log(`${'='.repeat(80)}`)

    try {
      // FASE 1: Análisis inicial y toma de decisión
      console.log(`\n🧠 FASE 1: ANÁLISIS INICIAL Y TOMA DE DECISIÓN`)
      const context = await this.buildAgentContext(userQuery, chatId, userId)
      const initialDecision = await this.makeAgentDecision(context)
      
      console.log(`🎯 Decisión inicial: ${initialDecision.action}`)
      console.log(`📊 Confianza: ${initialDecision.confidence.toFixed(2)}`)
      console.log(`💭 Razonamiento: ${initialDecision.reasoning}`)

      let searchResults: EnhancedSearchResult[] = []
      let searchRounds = 0
      let modelDecisions = 1

      // FASE 2: Ejecución de búsquedas si es necesario
      if (initialDecision.action === 'search') {
        console.log(`\n🔍 FASE 2: EJECUCIÓN DE BÚSQUEDAS AGÉNTICAS`)
        
        const searchStrategy = initialDecision.searchStrategy || {
          maxRounds: options?.maxSearchRounds || 8,
          maxResultsPerRound: 12,
          prioritizeOfficial: true,
          prioritizeAcademic: true,
          prioritizeFreshness: true
        }

        searchResults = await this.executeAgenticSearch(
          userQuery,
          context,
          searchStrategy,
          initialDecision
        )
        
        searchRounds = searchStrategy.maxRounds
        modelDecisions++
      }

      // FASE 3: Generación de respuesta con análisis
      console.log(`\n📝 FASE 3: GENERACIÓN DE RESPUESTA AGÉNTICA`)
      const response = await this.generateAgenticResponse(
        userQuery,
        context,
        searchResults,
        initialDecision,
        options
      )

      const processingTime = Date.now() - startTime

      console.log(`\n🎯 PROCESAMIENTO AGÉNTICO COMPLETADO`)
      console.log(`📊 Resumen:`)
      console.log(`   🔍 Rondas de búsqueda: ${searchRounds}`)
      console.log(`   📄 Fuentes encontradas: ${searchResults.length}`)
      console.log(`   🧠 Decisiones del modelo: ${modelDecisions}`)
      console.log(`   ⏱️ Tiempo de procesamiento: ${(processingTime / 1000).toFixed(1)}s`)
      console.log(`   🎯 Confianza final: ${response.metadata.confidence.toFixed(2)}`)
      console.log(`${'='.repeat(80)}`)

      return response

    } catch (error) {
      console.error('❌ Error en procesamiento agéntico:', error)
      
      // Respuesta de fallback
      return {
        content: `Disculpe, hubo un error procesando su consulta. Por favor, intente reformular su pregunta de manera más específica.`,
        sources: [],
        metadata: {
          searchRounds: 0,
          totalSources: 0,
          processingTime: Date.now() - startTime,
          modelDecisions: 0,
          confidence: 0.3
        }
      }
    }
  }

  /**
   * Construye el contexto del agente
   */
  private async buildAgentContext(
    userQuery: string,
    chatId: string,
    userId: string
  ): Promise<TongyiAgentContext> {
    const conversationHistory = await this.memoryManager.getRelevantHistory(
      chatId,
      userId,
      userQuery,
      10
    )

    const searchHistory = await this.memoryManager.getSearchContext(chatId, userId)

    return {
      userQuery,
      conversationHistory,
      searchHistory: searchHistory.previousSearches,
      userPreferences: {
        preferredDetailLevel: 'comprehensive',
        preferredSources: 'mixed',
        enableAnalysis: true,
        enableRecommendations: true
      },
      currentSearchResults: [],
      previousDecisions: []
    }
  }

  /**
   * Toma una decisión agéntica sobre cómo proceder
   */
  private async makeAgentDecision(context: TongyiAgentContext): Promise<TongyiAgentDecision> {
    const decisionPrompt = `
Eres un agente legal inteligente especializado en derecho colombiano con capacidades de investigación autónoma.

CONTEXTO:
- Consulta del usuario: "${context.userQuery}"
- Historial de conversación: ${context.conversationHistory.length} mensajes
- Historial de búsquedas: ${context.searchHistory.length} búsquedas previas

CAPACIDADES AGÉNTICAS:
1. SEARCH: Realizar búsquedas web exhaustivas con múltiples fuentes
2. RESPOND: Responder directamente basándose en conocimiento existente
3. CLARIFY: Solicitar aclaraciones al usuario
4. FOLLOW_UP: Hacer preguntas de seguimiento para profundizar

CRITERIOS DE DECISIÓN:
- Si la consulta requiere información actualizada o específica → SEARCH
- Si la consulta es general y tienes conocimiento suficiente → RESPOND
- Si la consulta es ambigua o incompleta → CLARIFY
- Si la consulta es compleja y necesita profundización → FOLLOW_UP

Responde en formato JSON:
{
  "action": "search|respond|clarify|follow_up",
  "confidence": 0.0-1.0,
  "reasoning": "Explicación detallada de la decisión",
  "searchStrategy": {
    "maxRounds": 6-12,
    "maxResultsPerRound": 8-15,
    "prioritizeOfficial": true/false,
    "prioritizeAcademic": true/false,
    "prioritizeFreshness": true/false
  },
  "responseStrategy": {
    "includeSources": true/false,
    "includeAnalysis": true/false,
    "includeRecommendations": true/false,
    "includeWarnings": true/false
  },
  "nextSteps": ["paso1", "paso2", "paso3"]
}
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: decisionPrompt
          },
          {
            role: "user",
            content: `Analiza la consulta y toma una decisión agéntica: "${context.userQuery}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })

      const content = response.choices[0]?.message?.content || '{}'
      const decision = JSON.parse(content) as TongyiAgentDecision

      return decision
    } catch (error) {
      console.error('❌ Error en toma de decisión:', error)
      
      // Decisión de fallback
      return {
        action: 'search',
        confidence: 0.7,
        reasoning: 'Fallback a búsqueda por error en decisión',
        searchStrategy: {
          maxRounds: 6,
          maxResultsPerRound: 10,
          prioritizeOfficial: true,
          prioritizeAcademic: true,
          prioritizeFreshness: true
        }
      }
    }
  }

  /**
   * Ejecuta búsquedas agénticas con decisiones dinámicas
   */
  private async executeAgenticSearch(
    userQuery: string,
    context: TongyiAgentContext,
    searchStrategy: TongyiAgentDecision['searchStrategy'],
    initialDecision: TongyiAgentDecision
  ): Promise<EnhancedSearchResult[]> {
    const allResults: EnhancedSearchResult[] = []
    let currentRound = 0

    while (currentRound < searchStrategy!.maxRounds) {
      currentRound++
      console.log(`\n🔍 RONDA ${currentRound} DE BÚSQUEDA AGÉNTICA`)

        // Ejecutar búsqueda con orquestador simplificado (solo Serper + Jina AI)
        const roundResults = await executeEnhancedSearch(userQuery, {
          maxResults: searchStrategy!.maxResultsPerRound,
          includeOfficialSources: searchStrategy!.prioritizeOfficial,
          includeAcademicSources: searchStrategy!.prioritizeAcademic,
          includeGeneralSources: true, // Usar Serper adicional
          prioritizeFreshness: searchStrategy!.prioritizeFreshness
        })

      allResults.push(...roundResults)
      console.log(`✅ Ronda ${currentRound}: ${roundResults.length} resultados`)

      // Evaluar si necesitamos más búsquedas
      if (currentRound >= 3) {
        const shouldContinue = await this.evaluateSearchSufficiency(
          userQuery,
          allResults,
          context
        )

        if (!shouldContinue) {
          console.log(`🎯 Información suficiente encontrada en ronda ${currentRound}`)
          break
        }
      }

      // Pausa entre rondas para evitar rate limiting
      if (currentRound < searchStrategy!.maxRounds) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Eliminar duplicados y optimizar resultados
    const uniqueResults = this.deduplicateResults(allResults)
    const optimizedResults = this.optimizeSearchResults(uniqueResults, userQuery)

    console.log(`📊 Total resultados únicos: ${optimizedResults.length}`)
    return optimizedResults
  }

  /**
   * Evalúa si la información encontrada es suficiente
   */
  private async evaluateSearchSufficiency(
    userQuery: string,
    results: EnhancedSearchResult[],
    context: TongyiAgentContext
  ): Promise<boolean> {
    const evaluationPrompt = `
Eres un agente legal evaluando la suficiencia de información encontrada.

CONSULTA: "${userQuery}"
RESULTADOS ENCONTRADOS: ${results.length} fuentes
CALIDAD PROMEDIO: ${results.length > 0 ? (results.reduce((sum, r) => sum + r.quality, 0) / results.length).toFixed(1) : 0}/10

CRITERIOS DE SUFICIENCIA:
- ¿Tenemos información oficial sobre el tema?
- ¿Tenemos información académica/jurisprudencial relevante?
- ¿La información es actualizada y precisa?
- ¿Podemos responder completamente la consulta?

Responde solo "true" si la información es suficiente, "false" si necesitamos más búsquedas.
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: evaluationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      })

      const content = response.choices[0]?.message?.content || 'false'
      return content.toLowerCase().includes('true')
    } catch (error) {
      console.error('❌ Error en evaluación de suficiencia:', error)
      return results.length >= 15 // Fallback: suficiente si tenemos 15+ resultados
    }
  }

  /**
   * Genera respuesta agéntica con análisis completo
   */
  private async generateAgenticResponse(
    userQuery: string,
    context: TongyiAgentContext,
    searchResults: EnhancedSearchResult[],
    decision: TongyiAgentDecision,
    options?: any
  ): Promise<TongyiAgentResponse> {
    const responsePrompt = `
Eres un asistente legal experto en derecho colombiano. Genera una respuesta completa y precisa basándote en la información proporcionada.

CONSULTA: "${userQuery}"

INFORMACIÓN ENCONTRADA:
${searchResults.map((result, index) => `
${index + 1}. ${result.title}
   URL: ${result.url}
   Fuente: ${result.source}
   Calidad: ${result.quality}/10
   Autoridad: ${result.authority}/10
   Contenido: ${result.content.substring(0, 500)}...
`).join('\n')}

INSTRUCCIONES:
1. Responde de manera completa y precisa
2. Usa terminología jurídica apropiada
3. Incluye referencias específicas a artículos, leyes y jurisprudencia
4. Proporciona información práctica y aplicable
5. Si hay información insuficiente, indícalo claramente
6. Responde en español colombiano
7. Incluye análisis de la información cuando sea relevante
8. Proporciona recomendaciones prácticas cuando sea apropiado

FORMATO DE RESPUESTA:
- Introducción clara del tema
- Desarrollo detallado con referencias legales
- Análisis de la situación actual
- Recomendaciones prácticas
- Advertencias importantes si las hay
- Conclusión resumida
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: responsePrompt
          },
          {
            role: "user",
            content: `Genera una respuesta completa para: "${userQuery}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })

      let content = response.choices[0]?.message?.content || 'No se pudo generar respuesta'

      // Procesar fuentes
      const sources = searchResults.map(result => ({
        title: result.title,
        url: result.url,
        type: result.metadata.searchEngine,
        quality: result.quality,
        relevance: result.relevance
      }))

      // VERIFICACIÓN ANTI-ALUCINACIÓN
      console.log(`\n🛡️ VERIFICACIÓN ANTI-ALUCINACIÓN`)
      const factCheckResult = await this.antiHallucinationSystem.factCheckResponse(
        userQuery,
        content,
        searchResults.map(result => ({
          title: result.title,
          url: result.url,
          content: result.content
        })),
        {
          enableFactChecking: true,
          requireSources: true,
          maxConfidenceThreshold: 0.8,
          enableSourceVerification: true,
          enableCrossValidation: true
        }
      )

      // Aplicar correcciones si es necesario
      if (!factCheckResult.isAccurate || factCheckResult.confidence < 0.8) {
        console.log(`🔧 Aplicando correcciones anti-alucinación`)
        content = await this.antiHallucinationSystem.applyCorrections(
          content,
          factCheckResult,
          searchResults.map(result => ({
            title: result.title,
            url: result.url,
            content: result.content
          }))
        )
      }

      // Calcular análisis
      const analysis = this.calculateResponseAnalysis(searchResults, content)

      // Generar recomendaciones
      const recommendations = await this.generateRecommendations(userQuery, searchResults)

      // Generar advertencias mejoradas
      const warnings = await this.generateEnhancedWarnings(userQuery, searchResults, factCheckResult)

      return {
        content,
        sources,
        analysis,
        recommendations,
        warnings,
        metadata: {
          searchRounds: searchResults.length > 0 ? 1 : 0,
          totalSources: sources.length,
          processingTime: 0, // Se calculará externamente
          modelDecisions: 1,
          confidence: decision.confidence
        }
      }

    } catch (error) {
      console.error('❌ Error generando respuesta:', error)
      
      return {
        content: `Disculpe, hubo un error generando la respuesta. Por favor, intente reformular su consulta.`,
        sources: [],
        metadata: {
          searchRounds: 0,
          totalSources: 0,
          processingTime: 0,
          modelDecisions: 0,
          confidence: 0.3
        }
      }
    }
  }

  /**
   * Elimina resultados duplicados
   */
  private deduplicateResults(results: EnhancedSearchResult[]): EnhancedSearchResult[] {
    const seen = new Set<string>()
    return results.filter(result => {
      const key = result.url.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Optimiza los resultados de búsqueda
   */
  private optimizeSearchResults(results: EnhancedSearchResult[], query: string): EnhancedSearchResult[] {
    return results
      .sort((a, b) => {
        // Priorizar por calidad, relevancia y autoridad
        const scoreA = a.quality * 0.4 + a.relevance * 0.3 + a.authority * 0.3
        const scoreB = b.quality * 0.4 + b.relevance * 0.3 + b.authority * 0.3
        return scoreB - scoreA
      })
      .slice(0, 25) // Limitar a 25 resultados
  }

  /**
   * Calcula análisis de la respuesta
   */
  private calculateResponseAnalysis(results: EnhancedSearchResult[], content: string): TongyiAgentResponse['analysis'] {
    const completeness = Math.min(10, results.length * 0.4 + (content.length > 1000 ? 3 : 0))
    const accuracy = results.length > 0 ? results.reduce((sum, r) => sum + r.quality, 0) / results.length : 5
    const relevance = results.length > 0 ? results.reduce((sum, r) => sum + r.relevance, 0) / results.length : 5
    const authority = results.length > 0 ? results.reduce((sum, r) => sum + r.authority, 0) / results.length : 5
    const overall = (completeness + accuracy + relevance + authority) / 4

    return {
      completeness,
      accuracy,
      relevance,
      authority,
      overall
    }
  }

  /**
   * Genera recomendaciones basadas en la consulta y resultados
   */
  private async generateRecommendations(
    userQuery: string,
    results: EnhancedSearchResult[]
  ): Promise<string[]> {
    // Implementación básica - se puede mejorar con IA
    const recommendations: string[] = []
    
    if (results.some(r => r.metadata.domain.includes('.gov.co'))) {
      recommendations.push('Consulte las fuentes oficiales para información actualizada')
    }
    
    if (results.some(r => r.metadata.domain.includes('.edu.co'))) {
      recommendations.push('Revise la jurisprudencia y doctrina académica para análisis profundos')
    }
    
    if (results.length > 10) {
      recommendations.push('Considere consultar con un abogado especializado para casos específicos')
    }

    return recommendations
  }

  /**
   * Genera advertencias mejoradas basadas en la consulta, resultados y verificación
   */
  private async generateEnhancedWarnings(
    userQuery: string,
    results: EnhancedSearchResult[],
    factCheckResult: any
  ): Promise<string[]> {
    const warnings: string[] = []
    
    // Advertencias basadas en verificación de hechos
    if (!factCheckResult.isAccurate) {
      warnings.push('⚠️ Esta respuesta ha sido verificada y puede contener información no completamente precisa')
    }
    
    if (factCheckResult.confidence < 0.8) {
      warnings.push('⚠️ Nivel de confianza bajo - consulte fuentes oficiales para confirmar')
    }
    
    if (factCheckResult.issues && factCheckResult.issues.length > 0) {
      warnings.push('⚠️ Se detectaron posibles inconsistencias en la información')
    }
    
    // Advertencias basadas en fuentes
    if (results.length < 5) {
      warnings.push('⚠️ Información limitada encontrada - consulte fuentes adicionales')
    }
    
    if (results.some(r => r.freshness < 5)) {
      warnings.push('⚠️ Algunas fuentes pueden estar desactualizadas - verifique la vigencia')
    }
    
    if (!results.some(r => r.metadata.domain.includes('.gov.co'))) {
      warnings.push('⚠️ No se encontraron fuentes oficiales - consulte sitios gubernamentales')
    }
    
    // Advertencias específicas para consultas legales
    if (userQuery.toLowerCase().includes('tributario') || userQuery.toLowerCase().includes('impuesto')) {
      warnings.push('⚠️ Para asuntos tributarios, consulte directamente con la DIAN')
    }
    
    if (userQuery.toLowerCase().includes('laboral') || userQuery.toLowerCase().includes('trabajo')) {
      warnings.push('⚠️ Para asuntos laborales, consulte con el Ministerio del Trabajo')
    }
    
    // Advertencia general
    warnings.push('⚠️ Esta información es de carácter general - consulte con un abogado especializado para casos específicos')
    
    return warnings
  }
}

/**
 * Instancia singleton del agente Tongyi
 */
export function createTongyiAgent(apiKey: string): TongyiAgent {
  return new TongyiAgent(apiKey)
}
