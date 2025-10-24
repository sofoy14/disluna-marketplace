/**
 * Agente Unificado Tongyi para Asistente Legal
 * Versión simplificada que integra todos los sistemas existentes
 */

import OpenAI from "openai"
import { ChatMemoryManager } from "@/lib/memory/chat-memory-manager"
import { AntiHallucinationSystem } from "@/lib/anti-hallucination/anti-hallucination-system"
import { UnifiedDeepResearchOrchestrator, UnifiedResearchConfig, UnifiedResearchResult } from "@/lib/tongyi/unified-deep-research-orchestrator"

export interface UnifiedLegalAgentConfig extends Partial<UnifiedResearchConfig> {
  enableMemory?: boolean
  enableAntiHallucination?: boolean
  preferredSources?: string[]
}

export class TongyiUnifiedLegalAgent {
  private client: OpenAI
  private memoryManager: ChatMemoryManager
  private antiHallucinationSystem: AntiHallucinationSystem
  private unifiedOrchestrator: UnifiedDeepResearchOrchestrator
  private config: UnifiedLegalAgentConfig
  private modelName: string = 'alibaba/tongyi-deepresearch-30b-a3b'

  constructor(apiKey: string, config: UnifiedLegalAgentConfig = {}) {
    this.config = {
      enableMemory: true,
      enableAntiHallucination: true,
      enableContinuousVerification: true,
      legalDomain: 'colombia',
      qualityThreshold: 0.85,
      modelName: this.modelName,
      apiKey: apiKey,
      ...config
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
    this.memoryManager = ChatMemoryManager.getInstance()
    this.antiHallucinationSystem = new AntiHallucinationSystem(apiKey)
    this.unifiedOrchestrator = new UnifiedDeepResearchOrchestrator(this.config as UnifiedResearchConfig)
  }

  public async processLegalQuery(
    userQuery: string,
    chatId: string,
    userId: string,
  ): Promise<UnifiedResearchResult> {
    console.log(`🚀 TongyiUnifiedLegalAgent: Procesando consulta legal para Chat ID: ${chatId}, User ID: ${userId}`)
    
    try {
      // 1. Build Context (from memory)
      const chatContext = this.config.enableMemory
        ? await this.memoryManager.getChatContext(chatId, userId)
        : { currentContext: "", relevantHistory: [] }

      console.log(`🏗️ [Agent Context] Construyendo contexto para chat ${chatId}`)
      console.log(`📊 [Agent Context] Contexto construido:`)
      console.log(`   💬 Mensajes: ${chatContext.conversationHistory?.length || 0}`)
      console.log(`   📄 Fuentes cacheadas: ${chatContext.cachedSources?.length || 0}`)
      console.log(`   📈 Calidad promedio: ${chatContext.qualityMetrics?.averageQuality?.toFixed(2) || '0.80'}`)
      console.log(`   🔍 Consultas anteriores: ${chatContext.searchHistory?.length || 0}`)

      // 2. Orchestrate Deep Research
      const researchResult = await this.unifiedOrchestrator.orchestrate(
        userQuery,
        chatId,
        userId,
        {
          mode: this.config.mode,
          maxRounds: this.config.maxRounds,
          maxSearchesPerRound: this.config.maxSearchesPerRound,
          enableContinuousVerification: this.config.enableContinuousVerification,
          enableIterativeRefinement: this.config.enableIterativeRefinement,
          legalDomain: this.config.legalDomain,
          qualityThreshold: this.config.qualityThreshold,
          modelName: this.modelName,
          apiKey: this.config.apiKey,
        }
      )

      console.log(`✅ TongyiUnifiedLegalAgent: Investigación completada.`)
      return researchResult

    } catch (error) {
      console.error(`❌ Error en TongyiUnifiedLegalAgent:`, error)
      
      // Return error result
      return {
        finalAnswer: `Disculpe, hubo un error procesando su consulta: ${error.message}`,
        sources: [],
        analysis: {
          researchMode: 'react',
          complexity: 'simple',
          qualityScore: 0.1,
          confidence: 0.1,
          verificationPassed: false,
          processingTime: 0,
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

export function createTongyiUnifiedLegalAgent(apiKey: string, config?: UnifiedLegalAgentConfig): TongyiUnifiedLegalAgent {
  return new TongyiUnifiedLegalAgent(apiKey, config)
}