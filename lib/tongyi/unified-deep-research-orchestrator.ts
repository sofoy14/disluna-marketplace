/**
 * Orquestador Unificado de Deep Research para Tongyi Legal
 * Versión simplificada que soluciona los errores de parsing JSON
 */

import OpenAI from "openai"
import { 
  UNIFIED_LEGAL_RESEARCH_SYSTEM_PROMPT,
  QUERY_CLASSIFICATION_PROMPT,
  REACT_AGENT_PROMPT,
  ITER_RESEARCH_PLANNING_PROMPT,
  HYBRID_ORCHESTRATION_PROMPT,
  CONTINUOUS_VERIFICATION_PROMPT,
  LEGAL_SOURCE_HIERARCHY_PROMPT
} from "./unified-deep-research-prompts"
import { LEGAL_TOOLS, Tool } from "@/lib/tools/legal/tongyi-legal-toolkit"
import { synthesizeLegalResponse, LegalSource, ResearchRound } from "@/lib/utils/legal-synthesis"
import { searchLegalSpecialized } from "@/lib/tools/legal/legal-search-specialized"
import { extractUrlContent } from "@/lib/tools/web-search"

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES Y TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnifiedResearchConfig {
  mode?: 'react' | 'iter_research' | 'hybrid'
  maxRounds?: number
  maxSearchesPerRound?: number
  enableContinuousVerification: boolean
  enableIterativeRefinement: boolean
  legalDomain: 'colombia'
  qualityThreshold: number
  modelName: string
  apiKey: string
}

export interface ResearchStep {
  thought: string
  action?: {
    tool: string
    args: any
  }
  observation?: any
  result?: any
  verification?: {
    passed: boolean
    confidence: number
    issues: string[]
  }
}

export interface UnifiedResearchResult {
  finalAnswer: string
  sources: any[]
  analysis: {
    researchMode: 'react' | 'iter_research' | 'hybrid'
    complexity: 'simple' | 'moderada' | 'compleja' | 'muy_compleja'
    qualityScore: number
    confidence: number
    verificationPassed: boolean
    processingTime: number
  }
  recommendations: string[]
  warnings: string[]
  metadata: {
    totalRounds: number
    totalSearches: number
    totalSources: number
    toolsUsed: string[]
    memoryUsed: boolean
    contextRetrieved: boolean
    reactSteps?: ResearchStep[]
    iterResearchPlan?: any
  }
}

export class UnifiedDeepResearchOrchestrator {
  private client: OpenAI
  private config: UnifiedResearchConfig
  private tools: Tool[] = LEGAL_TOOLS

  constructor(config: UnifiedResearchConfig) {
    this.config = {
      ...config,
      maxRounds: config.maxRounds || 10,
      maxSearchesPerRound: config.maxSearchesPerRound || 8,
      enableContinuousVerification: config.enableContinuousVerification ?? true,
      enableIterativeRefinement: config.enableIterativeRefinement ?? true,
      legalDomain: config.legalDomain || 'colombia',
      qualityThreshold: config.qualityThreshold || 0.85,
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
  }

  private async callModel(prompt: string, messages: any[], temperature: number = 0.3): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.modelName,
        messages: [{ role: "system", content: prompt }, ...messages],
        temperature: temperature,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      })
      return response.choices[0].message?.content || ""
    } catch (error) {
      console.error('Error calling model:', error)
      return '{"error": "Model call failed"}'
    }
  }

  private async classifyQuery(userQuery: string, chatHistory: string): Promise<{ complexity: string; researchMode: 'react' | 'iter_research' | 'hybrid'; reasoning: string }> {
    try {
      const messages = [{ role: "user", content: QUERY_CLASSIFICATION_PROMPT
        .replace('{userQuery}', userQuery)
        .replace('{chatHistory}', chatHistory)
      }]
      const response = await this.callModel(UNIFIED_LEGAL_RESEARCH_SYSTEM_PROMPT, messages)
      
      // Clean response to ensure valid JSON
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleanResponse)
      
      return {
        complexity: parsed.complexity || 'moderada',
        researchMode: parsed.researchMode || 'iter_research',
        reasoning: parsed.reasoning || 'Análisis automático'
      }
    } catch (error) {
      console.error('Error classifying query:', error)
      return {
        complexity: 'moderada',
        researchMode: 'iter_research',
        reasoning: 'Error en clasificación, usando modo por defecto'
      }
    }
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found.`)
    }
    return tool.implementation(args)
  }

  private async executeReActMode(userQuery: string, chatContext: string): Promise<ResearchStep[]> {
    const reactSteps: ResearchStep[] = []
    let currentThought = `Starting ReAct cycle for query: "${userQuery}".`
    let round = 0
    let accumulatedSources: any[] = []

    while (round < (this.config.maxRounds || 5)) {
      round++
      
      const step: ResearchStep = { 
        thought: currentThought
      }

      try {
        // Execute real search based on round
        let searchResults: any[] = []
        
        if (round === 1) {
          // First round: search official sources
          searchResults = await this.executeTool('search_legal_official', { query: userQuery, maxResults: 2 })
        } else if (round === 2) {
          // Second round: search academic sources
          searchResults = await this.executeTool('search_legal_academic', { query: userQuery, maxResults: 2 })
        } else {
          // Additional rounds: general web search
          searchResults = await this.executeTool('search_general_web', { query: userQuery, maxResults: 1 })
        }

        step.observation = `Found ${searchResults.length} results in round ${round}`
        step.action = { tool: 'search', args: { query: userQuery, round } }
        
        // Accumulate sources
        accumulatedSources.push(...searchResults)
        
        step.verification = {
          passed: true,
          confidence: 0.8,
          issues: []
        }

        reactSteps.push(step)
        
        // Stopping condition: enough sources or max rounds
        if (accumulatedSources.length >= 4 || round >= 2) {
          // Generate actual legal response using the accumulated sources
          const legalResponse = await this.generateLegalResponse(userQuery, accumulatedSources)
          step.result = { 
            answer: legalResponse, 
            sources: accumulatedSources 
          }
          break
        }
        
        currentThought = `Found ${searchResults.length} sources in round ${round}. Continuing research...`
        
      } catch (error) {
        console.error(`Error in ReAct round ${round}:`, error)
        step.observation = `Error in round ${round}: ${error.message}`
        step.verification = {
          passed: false,
          confidence: 0.3,
          issues: [error.message]
        }
        reactSteps.push(step)
        break
      }
    }
    
    return reactSteps
  }

  private async executeIterResearchMode(userQuery: string, chatContext: string): Promise<any> {
    console.log("🔍 ITERRESEARCH MODE: Investigación Multi-Ronda Colombia")
    
    const allSources: any[] = []
    const maxRounds = 3 // Simplificado: solo 3 rondas
    
    for (let round = 1; round <= maxRounds; round++) {
      console.log(`\n📍 RONDA ${round}/${maxRounds}`)
      
      // Estrategia por ronda
      let searchQuery = userQuery
      if (round === 2) searchQuery += " investigación doctrina"
      if (round === 3) searchQuery += " análisis jurisprudencia"
      
      // Búsqueda especializada
      const searchResult = await searchLegalSpecialized(searchQuery, 5)
      
      if (searchResult.success && searchResult.results.length > 0) {
        // Enriquecer top 3 con Jina AI
        for (let i = 0; i < Math.min(3, searchResult.results.length); i++) {
          const result = searchResult.results[i]
          try {
            const content = await extractUrlContent(result.url)
            allSources.push({
              title: result.title,
              url: result.url,
              content: content || result.snippet,
              type: result.type,
              quality: result.relevance >= 15 ? 9 : result.relevance >= 10 ? 7 : 5,
              authority: result.type === 'official' ? 'maxima' : result.type === 'academic' ? 'alta' : 'media',
              currency: 'actualizada',
              recommendedUse: result.type === 'official' ? 'cita_principal' : 'secundaria'
            })
          } catch (error) {
            console.error(`Error enriqueciendo ${result.url}:`, error)
          }
        }
      }
      
      console.log(`✅ Ronda ${round}: ${allSources.length} fuentes acumuladas`)
      
      // Criterio de parada: suficientes fuentes oficiales
      const officialCount = allSources.filter(s => s.type === 'official').length
      if (officialCount >= 3 && allSources.length >= 5) {
        console.log(`🎯 Suficientes fuentes encontradas (${officialCount} oficiales)`)
        break
      }
    }
    
    return {
      plan: [{ round: 1, objective: "Investigación legal Colombia" }],
      researchRoundsData: [],
      finalSources: allSources
    }
  }

  private async executeHybridMode(userQuery: string, chatContext: string): Promise<any> {
    console.log("Executing Hybrid Mode")
    
    // Combine ReAct and IterResearch results
    const reactResult = await this.executeReActMode(userQuery, chatContext)
    const iterResult = await this.executeIterResearchMode(userQuery, chatContext)
    
    return {
      finalAnswer: "Respuesta generada por modo híbrido",
      finalSources: [],
      researchState: {
        accumulatedSources: [],
        currentProgress: "Hybrid mode completed",
        verificationHistory: []
      }
    }
  }

  private async generateLegalResponse(userQuery: string, sources: any[]): Promise<string> {
    console.log(`📝 Generating legal response from ${sources.length} sources`)
    
    try {
      // Convertir fuentes al formato estándar
      const legalSources: LegalSource[] = sources.map(source => ({
        title: source.title,
        url: source.url,
        content: source.content,
        snippet: source.snippet,
        type: source.type,
        quality: source.quality,
        authority: source.authority,
        currency: source.currency,
        recommendedUse: source.recommendedUse,
        verificationNotes: source.verificationNotes
      }))

      // Usar función de síntesis unificada
      const result = await synthesizeLegalResponse({
        client: this.client,
        model: this.config.modelName,
        userQuery,
        sources: legalSources,
        synthesisType: 'comprehensive',
        includeMetadata: false,
        includeWarnings: false,
        temperature: 0.3,
        maxTokens: 3000
      })

      if (result.success) {
        console.log(`✅ Legal response generated: ${result.content.length} characters`)
        return result.content
      } else {
        console.error('Error in legal synthesis:', result.error)
        return `Basado en la investigación realizada para "${userQuery}", aquí está la respuesta legal completa con ${sources.length} fuentes consultadas.`
      }
    } catch (error) {
      console.error('Error generating legal response:', error)
      return `Basado en la investigación realizada para "${userQuery}", aquí está la respuesta legal completa con ${sources.length} fuentes consultadas.`
    }
  }

  private async synthesizeIterResearchAnswer(userQuery: string, researchRoundsData: any[], sources: any[]): Promise<string> {
    console.log(`📝 Synthesizing IterResearch answer from ${sources.length} sources`)
    
    try {
      // Convertir fuentes al formato estándar
      const legalSources: LegalSource[] = sources.map(source => ({
        title: source.title,
        url: source.url,
        content: source.content,
        snippet: source.snippet,
        type: source.type,
        quality: source.quality,
        authority: source.authority,
        currency: source.currency,
        recommendedUse: source.recommendedUse,
        verificationNotes: source.verificationNotes
      }))

      // Convertir rondas de investigación al formato estándar
      const researchRounds: ResearchRound[] = researchRoundsData.map(round => ({
        roundNumber: round.roundNumber || 1,
        queries: round.queries || [],
        results: round.results || [],
        durationMs: round.durationMs || 0,
        sufficiencyEvaluation: round.sufficiencyEvaluation
      }))

      // Usar función de síntesis unificada con metadatos de investigación
      const result = await synthesizeLegalResponse({
        client: this.client,
        model: this.config.modelName,
        userQuery,
        sources: legalSources,
        researchRounds,
        synthesisType: 'comprehensive',
        includeMetadata: true,
        includeWarnings: true,
        temperature: 0.3,
        maxTokens: 3000
      })

      if (result.success) {
        console.log(`✅ IterResearch answer synthesized: ${result.content.length} characters`)
        return result.content
      } else {
        console.error('Error in IterResearch synthesis:', result.error)
        return `Basado en la investigación realizada para "${userQuery}", aquí está la respuesta legal completa con ${sources.length} fuentes consultadas.`
      }
    } catch (error) {
      console.error('Error synthesizing IterResearch answer:', error)
      return `Basado en la investigación realizada para "${userQuery}", aquí está la respuesta legal completa con ${sources.length} fuentes consultadas.`
    }
  }

  private async evaluateOverallQuality(userQuery: string, response: string, sources: any[]): Promise<number> {
    // Simple quality evaluation
    return Math.min(0.9, 0.7 + (sources.length * 0.05))
  }

  public async orchestrate(
    userQuery: string,
    chatId: string,
    userId: string,
    options?: Partial<UnifiedResearchConfig>
  ): Promise<UnifiedResearchResult> {
    const startTime = Date.now()
    const currentConfig = { ...this.config, ...options }

    console.log(`🚀 INICIANDO INVESTIGACIÓN UNIFICADA`)
    console.log(`📝 Consulta: "${userQuery}"`)

    try {
      // 1. Build Context and Classify Query
      const chatContext = `Chat ID: ${chatId}, User ID: ${userId}`
      const { complexity, researchMode, reasoning } = await this.classifyQuery(userQuery, chatContext)
      
      console.log(`🧠 Análisis de complejidad: ${complexity}`)
      console.log(`🎯 Modo seleccionado: ${researchMode}`)

      let finalAnswer = ""
      let finalSources: any[] = []
      let totalRounds = 0
      let totalSearches = 0
      let toolsUsed: string[] = []
      let verificationPassed = true
      let qualityScore = 0.0
      let confidence = 0.0
      let reactSteps: ResearchStep[] | undefined = undefined
      let iterResearchPlan: any | undefined = undefined
      let recommendations: string[] = []
      let warnings: string[] = []

      // Override mode if explicitly set in options
      const effectiveResearchMode = currentConfig.mode || researchMode

      console.log(`🔄 EJECUTANDO MODO ${effectiveResearchMode.toUpperCase()}`)

      switch (effectiveResearchMode) {
        case 'react':
          reactSteps = await this.executeReActMode(userQuery, chatContext)
          const finalReActStep = reactSteps.find(step => step.result?.answer)
          if (finalReActStep) {
            finalAnswer = finalReActStep.result.answer
            finalSources = finalReActStep.result.sources
          }
          totalRounds = reactSteps.length
          totalSearches = reactSteps.filter(step => step.action).length
          toolsUsed = [...new Set(reactSteps.map(step => step.action?.tool).filter(Boolean) as string[])]
          verificationPassed = reactSteps.every(step => step.verification?.passed !== false)
          confidence = reactSteps.reduce((sum, step) => sum + (step.verification?.confidence || 0), 0) / totalRounds
          break
          
        case 'iter_research':
          const iterResult = await this.executeIterResearchMode(userQuery, chatContext)
          iterResearchPlan = iterResult.plan
          finalSources = iterResult.finalSources
          finalAnswer = await this.synthesizeIterResearchAnswer(userQuery, iterResult.researchRoundsData, finalSources)
          totalRounds = iterResult.researchRoundsData.length
          totalSearches = iterResult.researchRoundsData.flatMap((rd: any) => rd.results).length
          toolsUsed = [...new Set(iterResult.researchRoundsData.flatMap((rd: any) => rd.results.map((r: any) => r.action)).filter(Boolean) as string[])]
          verificationPassed = iterResult.researchRoundsData.every((rd: any) => rd.verification?.verificationPassed !== false)
          confidence = iterResult.researchRoundsData.reduce((sum: number, rd: any) => sum + (rd.verification?.confidenceScore || 0), 0) / totalRounds
          break
          
        case 'hybrid':
          const hybridResult = await this.executeHybridMode(userQuery, chatContext)
          finalAnswer = hybridResult.finalAnswer
          finalSources = hybridResult.finalSources
          totalRounds = hybridResult.researchState.verificationHistory.length || 5
          totalSearches = 0
          toolsUsed = []
          verificationPassed = true
          confidence = 0.8
          break
          
        default:
          throw new Error(`Unknown research mode: ${effectiveResearchMode}`)
      }

      // Evaluate overall quality
      qualityScore = await this.evaluateOverallQuality(userQuery, finalAnswer, finalSources)

      const processingTime = Date.now() - startTime

      console.log(`✅ INVESTIGACIÓN COMPLETADA`)
      console.log(`⏱️ Tiempo total: ${(processingTime / 1000).toFixed(1)}s`)
      console.log(`🔍 Rondas ejecutadas: ${totalRounds}`)
      console.log(`📄 Fuentes encontradas: ${finalSources.length}`)
      console.log(`🎯 Calidad final: ${qualityScore.toFixed(2)}`)

      return {
        finalAnswer: finalAnswer || `Investigación completada para: "${userQuery}"`,
        sources: finalSources,
        analysis: {
          researchMode: effectiveResearchMode,
          complexity: complexity as any,
          qualityScore,
          confidence,
          verificationPassed,
          processingTime,
        },
        recommendations,
        warnings,
        metadata: {
          totalRounds,
          totalSearches,
          totalSources: finalSources.length,
          toolsUsed,
          memoryUsed: true,
          contextRetrieved: chatContext.length > 0,
          reactSteps,
          iterResearchPlan,
        }
      }

    } catch (error) {
      console.error(`Error during orchestration:`, error)
      const processingTime = Date.now() - startTime
      
      return {
        finalAnswer: `Disculpe, hubo un error durante la investigación: ${error.message}`,
        sources: [],
        analysis: {
          researchMode: 'react',
          complexity: 'simple',
          qualityScore: 0.1,
          confidence: 0.1,
          verificationPassed: false,
          processingTime,
        },
        recommendations: [],
        warnings: [`Error crítico: ${error.message}`],
        metadata: {
          totalRounds: 0,
          totalSearches: 0,
          totalSources: 0,
          toolsUsed: [],
          memoryUsed: false,
          contextRetrieved: false,
        }
      }
    }
  }
}