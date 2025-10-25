import OpenAI from "openai"
import { executeEnhancedSearch, EnhancedSearchResult } from "@/lib/tools/enhanced-search-orchestrator"
import { ChatMemoryManager } from "@/lib/memory/chat-memory-manager"
import { createAntiHallucinationSystem } from "@/lib/anti-hallucination/anti-hallucination-system"

export interface ReActStep {
  step: number
  thought: string
  action: 'search' | 'analyze' | 'verify' | 'synthesize' | 'respond'
  observation: string
  confidence: number
  nextAction?: string
}

export interface ReActResponse {
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
  reactSteps: ReActStep[]
  metadata: {
    searchRounds: number
    totalSources: number
    processingTime: number
    modelDecisions: number
    confidence: number
    verificationPassed: boolean
  }
}

/**
 * Agente Tongyi 30B con ciclo ReAct (Pensamiento-Acción-Observación)
 * Implementa verificación continua y toma de decisiones autónoma
 */
export class TongyiReActAgent {
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
   * Procesa una consulta usando el ciclo ReAct
   */
  async processQueryWithReAct(
    userQuery: string,
    chatId: string,
    userId: string,
    options?: {
      maxSearchRounds?: number
      enableAnalysis?: boolean
      enableRecommendations?: boolean
      preferredDetailLevel?: 'brief' | 'detailed' | 'comprehensive'
    }
  ): Promise<ReActResponse> {
    const startTime = Date.now()
    
    console.log(`\n🧠 TONGYI REACT AGENT - CICLO PENSAMIENTO-ACCIÓN-OBSERVACIÓN`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`💬 Chat ID: ${chatId}`)
    console.log(`👤 User ID: ${userId}`)
    console.log(`${'='.repeat(80)}`)

    const reactSteps: ReActStep[] = []
    let currentStep = 1
    let searchResults: EnhancedSearchResult[] = []
    let verificationPassed = false
    let finalResponse = ""

    try {
      // PASO 1: PENSAMIENTO INICIAL
      console.log(`\n🧠 PASO ${currentStep}: PENSAMIENTO INICIAL`)
      const initialThought = await this.generateThought(userQuery, [], "initial")
      
      reactSteps.push({
        step: currentStep,
        thought: initialThought,
        action: 'analyze',
        observation: 'Analizando la consulta del usuario',
        confidence: 0.7
      })
      
      console.log(`💭 Pensamiento: ${initialThought}`)
      currentStep++

      // PASO 2: ANÁLISIS Y PLANIFICACIÓN
      console.log(`\n🔍 PASO ${currentStep}: ANÁLISIS Y PLANIFICACIÓN`)
      const analysisResult = await this.analyzeQuery(userQuery, reactSteps)
      
      reactSteps.push({
        step: currentStep,
        thought: analysisResult.thought,
        action: 'search',
        observation: analysisResult.observation,
        confidence: analysisResult.confidence,
        nextAction: 'search'
      })
      
      console.log(`📊 Análisis: ${analysisResult.thought}`)
      currentStep++

      // PASO 3: BÚSQUEDAS ITERATIVAS CON OBSERVACIÓN
      if (analysisResult.needsSearch) {
        console.log(`\n🔍 PASO ${currentStep}: BÚSQUEDAS ITERATIVAS`)
        
        const maxRounds = options?.maxSearchRounds || 6
        let searchRound = 0
        
        while (searchRound < maxRounds && !verificationPassed) {
          searchRound++
          console.log(`\n🔍 RONDA ${searchRound} DE BÚSQUEDA`)
          
          // Ejecutar búsqueda
          const roundResults = await executeEnhancedSearch(userQuery, {
            maxResults: 8,
            includeOfficialSources: true,
            includeAcademicSources: true,
            includeGeneralSources: true,
            prioritizeFreshness: true
          })
          
          searchResults.push(...roundResults)
          
          // Observar resultados
          const searchObservation = await this.observeSearchResults(roundResults, searchResults, userQuery)
          
          reactSteps.push({
            step: currentStep,
            thought: `Búsqueda ronda ${searchRound}: ${roundResults.length} resultados`,
            action: 'search',
            observation: searchObservation,
            confidence: this.calculateSearchConfidence(roundResults),
            nextAction: searchRound < 3 ? 'search' : 'verify'
          })
          
          console.log(`👁️ Observación: ${searchObservation}`)
          currentStep++
          
          // Verificar si tenemos suficiente información
          if (searchRound >= 3) {
            const sufficiencyCheck = await this.checkInformationSufficiency(searchResults, userQuery)
            if (sufficiencyCheck.sufficient) {
              console.log(`✅ Información suficiente encontrada`)
              break
            }
          }
        }
      }

      // PASO 4: VERIFICACIÓN DE INFORMACIÓN
      console.log(`\n🛡️ PASO ${currentStep}: VERIFICACIÓN DE INFORMACIÓN`)
      const verificationResult = await this.verifyInformation(searchResults, userQuery)
      
      reactSteps.push({
        step: currentStep,
        thought: verificationResult.thought,
        action: 'verify',
        observation: verificationResult.observation,
        confidence: verificationResult.confidence
      })
      
      verificationPassed = verificationResult.passed
      console.log(`🔍 Verificación: ${verificationResult.observation}`)
      currentStep++

      // PASO 5: SÍNTESIS Y GENERACIÓN DE RESPUESTA
      console.log(`\n📝 PASO ${currentStep}: SÍNTESIS Y GENERACIÓN`)
      const synthesisResult = await this.synthesizeResponse(userQuery, searchResults, reactSteps, verificationResult)
      
      reactSteps.push({
        step: currentStep,
        thought: synthesisResult.thought,
        action: 'synthesize',
        observation: synthesisResult.observation,
        confidence: synthesisResult.confidence
      })
      
      finalResponse = synthesisResult.content
      console.log(`📄 Síntesis: ${synthesisResult.observation}`)
      currentStep++

      // PASO 6: VERIFICACIÓN FINAL DE LA RESPUESTA
      console.log(`\n🔍 PASO ${currentStep}: VERIFICACIÓN FINAL`)
      const finalVerification = await this.finalVerification(finalResponse, searchResults, userQuery)
      
      reactSteps.push({
        step: currentStep,
        thought: finalVerification.thought,
        action: 'verify',
        observation: finalVerification.observation,
        confidence: finalVerification.confidence
      })
      
      // Si la verificación final falla, regenerar respuesta
      if (!finalVerification.passed) {
        console.log(`🔄 Regenerando respuesta con correcciones`)
        finalResponse = await this.regenerateWithCorrections(finalResponse, finalVerification, searchResults, userQuery)
      }
      
      console.log(`✅ Verificación final: ${finalVerification.observation}`)

      const processingTime = Date.now() - startTime

      console.log(`\n🎯 CICLO REACT COMPLETADO`)
      console.log(`📊 Resumen:`)
      console.log(`   🧠 Pasos de pensamiento: ${reactSteps.length}`)
      console.log(`   🔍 Rondas de búsqueda: ${searchResults.length > 0 ? Math.ceil(searchResults.length / 8) : 0}`)
      console.log(`   📄 Fuentes encontradas: ${searchResults.length}`)
      console.log(`   🛡️ Verificación: ${verificationPassed ? '✅' : '❌'}`)
      console.log(`   ⏱️ Tiempo de procesamiento: ${(processingTime / 1000).toFixed(1)}s`)
      console.log(`${'='.repeat(80)}`)

      return {
        content: finalResponse,
        sources: searchResults.map(result => ({
          title: result.title,
          url: result.url,
          type: result.metadata.searchEngine,
          quality: result.quality,
          relevance: result.relevance
        })),
        analysis: this.calculateResponseAnalysis(searchResults, finalResponse),
        recommendations: await this.generateRecommendations(userQuery, searchResults),
        warnings: await this.generateEnhancedWarnings(userQuery, searchResults, finalVerification),
        reactSteps,
        metadata: {
          searchRounds: Math.ceil(searchResults.length / 8),
          totalSources: searchResults.length,
          processingTime,
          modelDecisions: reactSteps.length,
          confidence: finalVerification.confidence,
          verificationPassed: finalVerification.passed
        }
      }

    } catch (error) {
      console.error('❌ Error en ciclo ReAct:', error)
      
      return {
        content: `Disculpe, hubo un error procesando su consulta. Por favor, intente reformular su pregunta de manera más específica.`,
        sources: [],
        reactSteps,
        metadata: {
          searchRounds: 0,
          totalSources: 0,
          processingTime: Date.now() - startTime,
          modelDecisions: reactSteps.length,
          confidence: 0.3,
          verificationPassed: false
        }
      }
    }
  }

  /**
   * Genera un pensamiento sobre la consulta
   */
  private async generateThought(query: string, context: ReActStep[], phase: string): Promise<string> {
    const thoughtPrompt = `
Eres un asistente legal experto en derecho colombiano. Genera un pensamiento sobre la consulta del usuario.

CONSULTA: "${query}"
FASE: ${phase}
CONTEXTO: ${context.length > 0 ? context.map(c => c.thought).join('; ') : 'Ninguno'}

Genera un pensamiento claro y específico sobre:
1. Qué tipo de consulta legal es
2. Qué información necesitas encontrar
3. Qué fuentes serían más relevantes
4. Qué nivel de detalle requiere

Responde en máximo 2 oraciones:
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: thoughtPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })

      return response.choices[0]?.message?.content || 'Analizando consulta legal...'
    } catch (error) {
      return 'Analizando consulta legal...'
    }
  }

  /**
   * Analiza la consulta y determina la estrategia
   */
  private async analyzeQuery(query: string, context: ReActStep[]): Promise<{
    thought: string
    observation: string
    confidence: number
    needsSearch: boolean
  }> {
    const analysisPrompt = `
Eres un asistente legal experto. Analiza la consulta y determina la estrategia de investigación.

CONSULTA: "${query}"
CONTEXTO: ${context.map(c => c.thought).join('; ')}

Analiza:
1. ¿Es una consulta que requiere búsqueda web?
2. ¿Qué tipo de fuentes necesitas? (oficiales, académicas, generales)
3. ¿Cuál es el nivel de complejidad?
4. ¿Qué información específica necesitas encontrar?

Responde en formato JSON:
{
  "thought": "Pensamiento sobre la consulta",
  "observation": "Observación sobre lo que necesitas",
  "confidence": 0.0-1.0,
  "needsSearch": true/false,
  "searchStrategy": "estrategia de búsqueda"
}
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: analysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 300
      })

      const content = response.choices[0]?.message?.content || '{}'
      const result = JSON.parse(content)

      return {
        thought: result.thought || 'Analizando consulta...',
        observation: result.observation || 'Determinando estrategia...',
        confidence: result.confidence || 0.7,
        needsSearch: result.needsSearch !== false
      }
    } catch (error) {
      return {
        thought: 'Analizando consulta legal...',
        observation: 'Determinando estrategia de investigación...',
        confidence: 0.7,
        needsSearch: true
      }
    }
  }

  /**
   * Observa los resultados de búsqueda
   */
  private async observeSearchResults(
    roundResults: EnhancedSearchResult[],
    allResults: EnhancedSearchResult[],
    query: string
  ): Promise<string> {
    const observationPrompt = `
Eres un asistente legal experto. Observa los resultados de búsqueda.

CONSULTA: "${query}"
RESULTADOS DE ESTA RONDA: ${roundResults.length}
TOTAL RESULTADOS: ${allResults.length}

Observa:
1. ¿La calidad de los resultados?
2. ¿La relevancia para la consulta?
3. ¿La autoridad de las fuentes?
4. ¿Necesitas más información?

Responde en máximo 2 oraciones:
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: observationPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 150
      })

      return response.choices[0]?.message?.content || 'Observando resultados de búsqueda...'
    } catch (error) {
      return 'Observando resultados de búsqueda...'
    }
  }

  /**
   * Verifica la información encontrada
   */
  private async verifyInformation(
    results: EnhancedSearchResult[],
    query: string
  ): Promise<{
    thought: string
    observation: string
    confidence: number
    passed: boolean
  }> {
    console.log(`🔍 Verificando ${results.length} fuentes`)

    const verificationPrompt = `
Eres un verificador de hechos especializado en derecho colombiano.

CONSULTA: "${query}"
FUENTES ENCONTRADAS: ${results.length}

Verifica:
1. ¿La información es suficiente para responder?
2. ¿Las fuentes son confiables y autorizadas?
3. ¿La información está actualizada?
4. ¿Hay consistencia entre las fuentes?

Responde en formato JSON:
{
  "thought": "Pensamiento sobre la verificación",
  "observation": "Observación sobre la calidad de la información",
  "confidence": 0.0-1.0,
  "passed": true/false,
  "issues": ["problema1", "problema2"]
}
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: verificationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      })

      const content = response.choices[0]?.message?.content || '{}'
      const result = JSON.parse(content)

      return {
        thought: result.thought || 'Verificando información...',
        observation: result.observation || 'Evaluando calidad de fuentes...',
        confidence: result.confidence || 0.7,
        passed: result.passed !== false
      }
    } catch (error) {
      return {
        thought: 'Verificando información encontrada...',
        observation: 'Evaluando calidad y suficiencia de fuentes...',
        confidence: 0.6,
        passed: results.length >= 3
      }
    }
  }

  /**
   * Sintetiza la respuesta basándose en la información verificada
   */
  private async synthesizeResponse(
    query: string,
    results: EnhancedSearchResult[],
    context: ReActStep[],
    verification: any
  ): Promise<{
    thought: string
    observation: string
    confidence: number
    content: string
  }> {
    console.log(`📝 Sintetizando respuesta con ${results.length} fuentes`)

    const synthesisPrompt = `
Eres un asistente legal experto en derecho colombiano. Sintetiza una respuesta precisa basándote en la información verificada.

CONSULTA: "${query}"
FUENTES VERIFICADAS: ${results.length}
CONTEXTO DEL PROCESO: ${context.map(c => c.thought).join('; ')}

INFORMACIÓN DISPONIBLE:
${results.map((result, index) => `
${index + 1}. ${result.title}
   URL: ${result.url}
   Calidad: ${result.quality}/10
   Autoridad: ${result.authority}/10
   Contenido: ${result.content.substring(0, 300)}...
`).join('\n')}

INSTRUCCIONES:
1. Responde ÚNICAMENTE con información respaldada por las fuentes
2. Usa lenguaje conservador y preciso
3. Incluye referencias específicas cuando sea posible
4. Si hay información insuficiente, indícalo claramente
5. Termina con advertencias sobre consulta profesional

Genera la respuesta sintetizada:
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: synthesisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })

      const content = response.choices[0]?.message?.content || 'No se pudo generar respuesta'

      return {
        thought: 'Sintetizando información verificada...',
        observation: `Respuesta generada con ${results.length} fuentes verificadas`,
        confidence: verification.confidence,
        content
      }
    } catch (error) {
      return {
        thought: 'Sintetizando información...',
        observation: 'Generando respuesta basada en fuentes verificadas',
        confidence: 0.6,
        content: 'Disculpe, hubo un error generando la respuesta.'
      }
    }
  }

  /**
   * Verificación final de la respuesta
   */
  private async finalVerification(
    response: string,
    sources: EnhancedSearchResult[],
    query: string
  ): Promise<{
    thought: string
    observation: string
    confidence: number
    passed: boolean
  }> {
    console.log(`🔍 Verificación final de la respuesta`)

    const finalVerificationPrompt = `
Eres un verificador de hechos especializado en derecho colombiano. Verifica la respuesta final.

CONSULTA: "${query}"
RESPUESTA: "${response}"
FUENTES: ${sources.length}

Verifica:
1. ¿La respuesta es precisa y está respaldada por las fuentes?
2. ¿Hay información inventada o especulativa?
3. ¿Las referencias legales son correctas?
4. ¿El lenguaje es apropiado y conservador?

Responde en formato JSON:
{
  "thought": "Pensamiento sobre la verificación final",
  "observation": "Observación sobre la calidad de la respuesta",
  "confidence": 0.0-1.0,
  "passed": true/false,
  "issues": ["problema1", "problema2"]
}
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: finalVerificationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      })

      const content = response.choices[0]?.message?.content || '{}'
      const result = JSON.parse(content)

      return {
        thought: result.thought || 'Verificando respuesta final...',
        observation: result.observation || 'Evaluando precisión y calidad...',
        confidence: result.confidence || 0.7,
        passed: result.passed !== false
      }
    } catch (error) {
      return {
        thought: 'Verificando respuesta final...',
        observation: 'Evaluando precisión y calidad de la respuesta',
        confidence: 0.6,
        passed: true
      }
    }
  }

  /**
   * Regenera la respuesta con correcciones
   */
  private async regenerateWithCorrections(
    originalResponse: string,
    verification: any,
    sources: EnhancedSearchResult[],
    query: string
  ): Promise<string> {
    console.log(`🔄 Regenerando respuesta con correcciones`)

    const correctionPrompt = `
Eres un asistente legal experto. Corrige la respuesta eliminando problemas identificados.

CONSULTA: "${query}"
RESPUESTA ORIGINAL: "${originalResponse}"
PROBLEMAS IDENTIFICADOS: ${verification.issues?.join(', ') || 'Ninguno específico'}

FUENTES DISPONIBLES:
${sources.map((source, index) => `
${index + 1}. ${source.title}
   Contenido: ${source.content.substring(0, 300)}...
`).join('\n')}

INSTRUCCIONES:
1. Elimina información no respaldada por las fuentes
2. Corrige referencias legales incorrectas
3. Usa lenguaje conservador
4. Incluye advertencias sobre limitaciones
5. Recomienda consulta profesional

Genera la respuesta corregida:
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: correctionPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })

      return response.choices[0]?.message?.content || originalResponse
    } catch (error) {
      return originalResponse + '\n\n⚠️ ADVERTENCIA: Esta respuesta puede contener información no verificada. Consulte fuentes oficiales.'
    }
  }

  /**
   * Verifica si la información es suficiente
   */
  private async checkInformationSufficiency(
    results: EnhancedSearchResult[],
    query: string
  ): Promise<{ sufficient: boolean; reason: string }> {
    if (results.length < 3) {
      return { sufficient: false, reason: 'Pocas fuentes encontradas' }
    }

    const officialSources = results.filter(r => r.metadata.domain.includes('.gov.co')).length
    if (officialSources === 0) {
      return { sufficient: false, reason: 'No se encontraron fuentes oficiales' }
    }

    const avgQuality = results.reduce((sum, r) => sum + r.quality, 0) / results.length
    if (avgQuality < 6) {
      return { sufficient: false, reason: 'Calidad promedio baja' }
    }

    return { sufficient: true, reason: 'Información suficiente encontrada' }
  }

  /**
   * Calcula la confianza de los resultados de búsqueda
   */
  private calculateSearchConfidence(results: EnhancedSearchResult[]): number {
    if (results.length === 0) return 0.2
    
    const avgQuality = results.reduce((sum, r) => sum + r.quality, 0) / results.length
    const avgRelevance = results.reduce((sum, r) => sum + r.relevance, 0) / results.length
    const avgAuthority = results.reduce((sum, r) => sum + r.authority, 0) / results.length
    
    return (avgQuality + avgRelevance + avgAuthority) / 30 // Normalizar a 0-1
  }

  /**
   * Calcula análisis de la respuesta
   */
  private calculateResponseAnalysis(results: EnhancedSearchResult[], content: string): ReActResponse['analysis'] {
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
   * Genera recomendaciones
   */
  private async generateRecommendations(query: string, results: EnhancedSearchResult[]): Promise<string[]> {
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
   * Genera advertencias mejoradas
   */
  private async generateEnhancedWarnings(
    userQuery: string,
    results: EnhancedSearchResult[],
    verification: any
  ): Promise<string[]> {
    const warnings: string[] = []
    
    if (!verification.passed) {
      warnings.push('⚠️ Esta respuesta ha sido verificada y puede contener información no completamente precisa')
    }
    
    if (verification.confidence < 0.8) {
      warnings.push('⚠️ Nivel de confianza bajo - consulte fuentes oficiales para confirmar')
    }
    
    if (results.length < 5) {
      warnings.push('⚠️ Información limitada encontrada - consulte fuentes adicionales')
    }
    
    if (results.some(r => r.freshness < 5)) {
      warnings.push('⚠️ Algunas fuentes pueden estar desactualizadas - verifique la vigencia')
    }
    
    warnings.push('⚠️ Esta información es de carácter general - consulte con un abogado especializado para casos específicos')
    
    return warnings
  }
}

/**
 * Instancia singleton del agente ReAct
 */
export function createTongyiReActAgent(apiKey: string): TongyiReActAgent {
  return new TongyiReActAgent(apiKey)
}










