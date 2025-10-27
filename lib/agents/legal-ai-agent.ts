import OpenAI from "openai"
import { ChatMemoryManager, ChatContext } from "@/lib/memory/chat-memory-manager"
import { runDynamicSearchWorkflow } from "@/lib/tools/dynamic-search-orchestrator"
import { runLegalSearchWorkflow } from "@/lib/tools/legal-search-orchestrator"
import { planLegalSearchStrategy } from "@/lib/tools/legal-search-planner"

export interface AgentDecision {
  action: 'search' | 'respond' | 'clarify' | 'follow_up'
  confidence: number
  reasoning: string
  searchStrategy?: 'dynamic' | 'traditional' | 'hybrid'
  searchQueries?: string[]
  maxRounds?: number
}

export interface AgentResponse {
  content: string
  action: string
  metadata: {
    searchExecuted: boolean
    searchRounds?: number
    totalSearches?: number
    totalResults?: number
    finalQuality?: number
    modelDecisions?: number
    searchStrategy?: string
    sources?: Array<{
      title: string
      url: string
      type: string
      quality: number
    }>
  }
  memory: {
    messageId: string
    timestamp: Date
  }
}

export interface AgentOptions {
  client: OpenAI
  model: string
  chatId: string
  userId: string
  enableMemory: boolean
  enableAgenticSearch: boolean
  maxSearchRounds: number
  searchTimeoutMs: number
}

type ReasoningStatus =
  | "analyzing"
  | "planning"
  | "researching"
  | "validating"
  | "generating"
  | "clarifying"
  | "complete"

interface ReasoningDescriptor {
  status: ReasoningStatus
  description: string
}

/**
 * AI Agent con capacidades agenticas de b├║squeda y memoria
 */
export class LegalAIAgent {
  private memoryManager: ChatMemoryManager
  private options: AgentOptions

  constructor(options: AgentOptions) {
    this.options = options
    this.memoryManager = ChatMemoryManager.getInstance()
  }

  private attachReasoningSteps(steps: ReasoningDescriptor[], content: string): string {
    if (!steps.length) {
      return content
    }

    const reasoningBlock = steps
      .map(step => this.formatReasoningStep(step.status, step.description))
      .join("\n\n")

    return `${reasoningBlock}\n\n${content}`.trim()
  }

  private formatReasoningStep(status: ReasoningStatus, description: string): string {
    const sanitizedDescription = this.truncateForReasoning(description)
    return `[REASONING:${status}:${sanitizedDescription}]`
  }

  private truncateForReasoning(text: string, maxLength = 180): string {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (normalized.length <= maxLength) {
      return normalized
    }
    return `${normalized.slice(0, maxLength - 3)}...`
  }

  private buildSearchReasoning(params: {
    userQuery: string
    strategy?: string
    totalSearches?: number
    totalResults?: number
    finalQuality?: number
    decisionReasoning?: string
    sourcesCount?: number
    rounds?: number
  }): ReasoningDescriptor[] {
    const {
      userQuery,
      strategy,
      totalSearches,
      totalResults,
      finalQuality,
      decisionReasoning,
      sourcesCount,
      rounds
    } = params

    const safeStrategy = strategy && strategy.trim() ? strategy : "investigacion"
    const safeSearches = typeof totalSearches === "number" && totalSearches > 0 ? totalSearches : 1
    const safeResults = typeof totalResults === "number" && totalResults >= 0 ? totalResults : 0
    const safeSources =
      typeof sourcesCount === "number" && sourcesCount > 0 ? sourcesCount : Math.min(safeResults, 5)

    return [
      {
        status: "analyzing",
        description: `Analizando la consulta del usuario: ${this.truncateForReasoning(userQuery, 120)}`
      },
      {
        status: "planning",
        description: decisionReasoning
          ? `Planificando estrategia ${safeStrategy} (${this.truncateForReasoning(decisionReasoning, 140)})`
          : `Definiendo estrategia ${safeStrategy}${rounds ? ` con hasta ${rounds} rondas` : ""}`
      },
      {
        status: "researching",
        description: `Ejecutando ${safeSearches} busquedas especializadas y analizando fuentes prioritarias`
      },
      {
        status: "validating",
        description: typeof finalQuality === "number"
          ? `Evaluando ${safeResults} resultados con calidad promedio ${finalQuality}/10`
          : `Depurando ${safeResults} resultados para garantizar relevancia y autoridad`
      },
      {
        status: "generating",
        description: "Sintetizando hallazgos y aplicando criterios legales colombianos"
      },
      {
        status: "complete",
        description: `Investigacion completada con ${safeSources} fuentes destacadas`
      }
    ]
  }

  private buildDirectAnswerReasoning(userQuery: string): ReasoningDescriptor[] {
    return [
      {
        status: "analyzing",
        description: `Analizando la consulta del usuario: ${this.truncateForReasoning(userQuery, 120)}`
      },
      {
        status: "generating",
        description: "Aplicando conocimiento juridico propio para elaborar la respuesta"
      },
      {
        status: "complete",
        description: "Respuesta legal lista para el usuario"
      }
    ]
  }

  private buildClarificationReasoning(
    userQuery: string,
    kind: "clarify" | "follow_up"
  ): ReasoningDescriptor[] {
    return [
      {
        status: "analyzing",
        description: `Analizando la consulta: ${this.truncateForReasoning(userQuery, 120)}`
      },
      {
        status: "clarifying",
        description:
          kind === "clarify"
            ? "Solicitando informacion adicional para aclarar la consulta"
            : "Formulando pregunta de seguimiento para profundizar en el caso"
      },
      {
        status: "complete",
        description: "Esperando respuesta del usuario para continuar"
      }
    ]
  }
  /**
   * Procesa una consulta del usuario con capacidades agenticas
   */
  async processQuery(
    userQuery: string,
    messageId: string
  ): Promise<AgentResponse> {
    console.log(`\n­ƒñû AI AGENT PROCESANDO CONSULTA`)
    console.log(`­ƒôØ Query: "${userQuery}"`)
    console.log(`­ƒÆ¼ Chat ID: ${this.options.chatId}`)
    console.log(`­ƒæñ User ID: ${this.options.userId}`)
    console.log(`­ƒºá Memoria: ${this.options.enableMemory ? 'ACTIVADA' : 'DESACTIVADA'}`)
    console.log(`­ƒöì B├║squeda agentica: ${this.options.enableAgenticSearch ? 'ACTIVADA' : 'DESACTIVADA'}`)
    console.log(`${'='.repeat(80)}`)

    try {
      // 1. Cargar contexto de memoria si est├í habilitado
      let chatContext: ChatContext | null = null
      if (this.options.enableMemory) {
        chatContext = await this.memoryManager.getChatContext(
          this.options.chatId,
          this.options.userId
        )
        console.log(`­ƒºá Contexto cargado: ${chatContext.conversationHistory.length} mensajes`)
      }

      // 2. Tomar decisi├│n agentica sobre qu├® hacer
      const decision = await this.makeAgenticDecision(userQuery, chatContext)
      console.log(`­ƒñû Decisi├│n agentica: ${decision.action} (confianza: ${decision.confidence.toFixed(2)})`)
      console.log(`­ƒÆ¡ Razonamiento: ${decision.reasoning}`)

      // 3. Ejecutar acci├│n basada en la decisi├│n
      let response: AgentResponse

      switch (decision.action) {
        case 'search':
          response = await this.executeSearchAction(userQuery, decision, chatContext)
          break
        case 'respond':
          response = await this.executeRespondAction(userQuery, chatContext)
          break
        case 'clarify':
          response = await this.executeClarifyAction(userQuery, chatContext)
          break
        case 'follow_up':
          response = await this.executeFollowUpAction(userQuery, chatContext)
          break
        default:
          response = await this.executeRespondAction(userQuery, chatContext)
      }

      // 4. Guardar en memoria si est├í habilitado
      if (this.options.enableMemory) {
        await this.memoryManager.saveMessage(
          this.options.chatId,
          this.options.userId,
          messageId,
          response.content,
          'assistant',
          response.metadata
        )
      }

      console.log(`Ô£à Respuesta generada: ${response.content.length} caracteres`)
      return response

    } catch (error) {
      console.error(`ÔØî Error en AI Agent:`, error)
      
      // Respuesta de error con fallback
      const errorResponse: AgentResponse = {
        content: `Disculpa, hubo un error t├®cnico al procesar tu consulta. Por favor, intenta nuevamente.`,
        action: 'error',
        metadata: {
          searchExecuted: false
        },
        memory: {
          messageId,
          timestamp: new Date()
        }
      }

      if (this.options.enableMemory) {
        await this.memoryManager.saveMessage(
          this.options.chatId,
          this.options.userId,
          messageId,
          errorResponse.content,
          'assistant',
          errorResponse.metadata
        )
      }

      return errorResponse
    }
  }

  /**
   * Toma una decisi├│n agentica sobre qu├® acci├│n realizar
   */
  private async makeAgenticDecision(
    userQuery: string,
    chatContext: ChatContext | null
  ): Promise<AgentDecision> {
    try {
      const contextInfo = chatContext ? `
HISTORIAL DE CONVERSACI├ôN:
${chatContext.currentContext}

B├ÜSQUEDAS ANTERIORES:
${chatContext.searchHistory.slice(-3).map(s => `- "${s.query}" (${s.results} resultados, calidad: ${s.quality}/10)`).join('\n')}

PREFERENCIAS DEL USUARIO:
- Estrategia: ${chatContext.userPreferences.preferredSearchStrategy}
- M├íximo de rondas: ${chatContext.userPreferences.maxSearchRounds}
- Decisi├│n del modelo: ${chatContext.userPreferences.enableModelDecision ? 'Activada' : 'Desactivada'}
` : 'Sin historial previo'

      const decisionPrompt = `Eres un agente de IA legal experto que debe decidir qu├® acci├│n tomar para responder una consulta del usuario.

CONSULTA ACTUAL: "${userQuery}"

${contextInfo}

CAPACIDADES DISPONIBLES:
1. **search**: Realizar b├║squeda web din├ímica con m├║ltiples rondas
2. **respond**: Responder directamente con conocimiento existente
3. **clarify**: Pedir aclaraciones al usuario
4. **follow_up**: Hacer preguntas de seguimiento

CRITERIOS DE DECISI├ôN:
- Si la consulta requiere informaci├│n actualizada o espec├¡fica ÔåÆ **search**
- Si la consulta es general y tienes conocimiento suficiente ÔåÆ **respond**
- Si la consulta es ambigua o incompleta ÔåÆ **clarify**
- Si necesitas m├ís informaci├│n para completar la respuesta ÔåÆ **follow_up**

ESTRATEGIAS DE B├ÜSQUEDA:
- **dynamic**: Sistema de b├║squeda din├ímica (hasta 10 rondas, modelo decide)
- **traditional**: Sistema tradicional (hasta 5 rondas, criterios fijos)
- **hybrid**: Combinaci├│n de ambos sistemas

Responde en formato JSON:
{
  "action": "search|respond|clarify|follow_up",
  "confidence": 0.0-1.0,
  "reasoning": "explicaci├│n detallada de la decisi├│n",
  "searchStrategy": "dynamic|traditional|hybrid",
  "searchQueries": ["consulta espec├¡fica 1", "consulta espec├¡fica 2"],
  "maxRounds": 5-10
}`

      const response = await this.options.client.chat.completions.create({
        model: this.options.model,
        messages: [
          { role: "system", content: decisionPrompt },
          { role: "user", content: `Analiza la consulta y decide qu├® acci├│n tomar: "${userQuery}"` }
        ],
        temperature: 0.1,
        max_tokens: 800,
        stream: false
      })

      const content = response.choices?.[0]?.message?.content || '{}'
      const decision = this.parseAgentDecision(content)

      // Validar decisi├│n
      if (!decision.action || !['search', 'respond', 'clarify', 'follow_up'].includes(decision.action)) {
        decision.action = 'search' // Fallback a b├║squeda
        decision.confidence = 0.5
        decision.reasoning = 'Decisi├│n inv├ílida, usando fallback a b├║squeda'
      }

      return decision

    } catch (error) {
      console.error('Error en decisi├│n agentica:', error)
      
      // Fallback a b├║squeda din├ímica
      return {
        action: 'search',
        confidence: 0.5,
        reasoning: 'Error en decisi├│n agentica, usando fallback a b├║squeda',
        searchStrategy: 'dynamic',
        searchQueries: [userQuery],
        maxRounds: this.options.maxSearchRounds
      }
    }
  }

  /**
   * Ejecuta acci├│n de b├║squeda
   */
  private async executeSearchAction(
    userQuery: string,
    decision: AgentDecision,
    chatContext: ChatContext | null
  ): Promise<AgentResponse> {
    console.log(`­ƒöì Ejecutando b├║squeda agentica con estrategia: ${decision.searchStrategy}`)

    try {
      let searchResult: any
      let metadata: AgentResponse['metadata']

      if (decision.searchStrategy === 'dynamic' || decision.searchStrategy === 'hybrid') {
        // Usar sistema de b├║squeda din├ímica
        searchResult = await runDynamicSearchWorkflow(userQuery, {
          client: this.options.client,
          model: this.options.model,
          maxSearchRounds: decision.maxRounds || this.options.maxSearchRounds,
          maxSearchesPerRound: 8,
          searchTimeoutMs: this.options.searchTimeoutMs,
          enableModelDecision: true
        })

        metadata = {
          searchExecuted: true,
          searchRounds: searchResult.metadata.totalRounds,
          totalSearches: searchResult.metadata.totalSearches,
          totalResults: searchResult.metadata.totalResults,
          finalQuality: searchResult.metadata.finalQuality,
          modelDecisions: searchResult.metadata.modelDecisions,
          searchStrategy: searchResult.metadata.searchStrategy,
          sources: searchResult.allResults.slice(0, 10).map((result: any) => ({
            title: result.title,
            url: result.url,
            type: result.type,
            quality: result.quality
          }))
        }

        // Registrar b├║squeda en memoria
        if (this.options.enableMemory && chatContext) {
          await this.memoryManager.recordSearch(
            this.options.chatId,
            this.options.userId,
            userQuery,
            searchResult.metadata.totalResults,
            searchResult.metadata.finalQuality
          )
        }

        // Generar respuesta usando el contexto enriquecido
        const response = await this.generateResponseWithContext(
          userQuery,
          searchResult.finalContext,
          chatContext
        )

        return {
          content: response,
          action: 'search',
          metadata,
          memory: {
            messageId: `${this.options.chatId}-${Date.now()}`,
            timestamp: new Date()
          }
        }

      } else {
        // Usar sistema tradicional
        const searchPlan = await planLegalSearchStrategy({
          client: this.options.client,
          model: this.options.model,
          userQuery,
          maxQueries: 5
        })

        const workflow = await runLegalSearchWorkflow(userQuery, {
          maxResults: 5,
          maxAttempts: Math.max(searchPlan.queries.length || 0, 1),
          searchTimeoutMs: this.options.searchTimeoutMs,
          searchQueries: searchPlan.queries
        })

        metadata = {
          searchExecuted: workflow.metadata.searchExecuted,
          searchRounds: 1,
          totalSearches: workflow.metadata.attempts,
          totalResults: workflow.sources.length,
          finalQuality: workflow.sources.length > 0 ? 7 : 3,
          searchStrategy: 'TRADITIONAL',
          sources: workflow.sources.map(source => ({
            title: source.title,
            url: source.url,
            type: source.type,
            quality: 7
          }))
        }

        // Generar respuesta usando el contexto tradicional
        const response = await this.generateResponseWithContext(
          userQuery,
          workflow.modelContext,
          chatContext
        )

        return {
          content: response,
          action: 'search',
          metadata,
          memory: {
            messageId: `${this.options.chatId}-${Date.now()}`,
            timestamp: new Date()
          }
        }
      }

    } catch (error) {
      console.error('Error en b├║squeda agentica:', error)
      
      // Fallback a respuesta sin b├║squeda
      const response = await this.generateResponseWithContext(
        userQuery,
        'Error en b├║squeda, respondiendo con conocimiento general',
        chatContext
      )

      return {
        content: response,
        action: 'search',
        metadata: {
          searchExecuted: false
        },
        memory: {
          messageId: `${this.options.chatId}-${Date.now()}`,
          timestamp: new Date()
        }
      }
    }
  }

  /**
   * Ejecuta acci├│n de respuesta directa
   */
  private async executeRespondAction(
    userQuery: string,
    chatContext: ChatContext | null
  ): Promise<AgentResponse> {
    console.log(`­ƒÆ¼ Respondiendo directamente sin b├║squeda`)

    const response = await this.generateResponseWithContext(
      userQuery,
      'Responde usando tu conocimiento legal colombiano sin realizar b├║squedas web',
      chatContext
    )

    return {
      content: response,
      action: 'respond',
      metadata: {
        searchExecuted: false
      },
      memory: {
        messageId: `${this.options.chatId}-${Date.now()}`,
        timestamp: new Date()
      }
    }
  }

  /**
   * Ejecuta acci├│n de aclaraci├│n
   */
  private async executeClarifyAction(
    userQuery: string,
    chatContext: ChatContext | null
  ): Promise<AgentResponse> {
    console.log(`ÔØô Solicitando aclaraci├│n`)

    const clarificationPrompt = `La consulta "${userQuery}" es ambigua o incompleta. Genera una pregunta de aclaraci├│n espec├¡fica para obtener m├ís informaci├│n del usuario.`

    const response = await this.options.client.chat.completions.create({
      model: this.options.model,
      messages: [
        { role: "system", content: "Eres un asistente legal que necesita aclarar consultas ambiguas." },
        { role: "user", content: clarificationPrompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || "┬┐Podr├¡as ser m├ís espec├¡fico en tu consulta?"

    return {
      content,
      action: 'clarify',
      metadata: {
        searchExecuted: false
      },
      memory: {
        messageId: `${this.options.chatId}-${Date.now()}`,
        timestamp: new Date()
      }
    }
  }

  /**
   * Ejecuta acci├│n de seguimiento
   */
  private async executeFollowUpAction(
    userQuery: string,
    chatContext: ChatContext | null
  ): Promise<AgentResponse> {
    console.log(`­ƒöä Generando pregunta de seguimiento`)

    const followUpPrompt = `Bas├índote en la consulta "${userQuery}" y el contexto de conversaci├│n, genera una pregunta de seguimiento ├║til para obtener m├ís informaci├│n espec├¡fica.`

    const response = await this.options.client.chat.completions.create({
      model: this.options.model,
      messages: [
        { role: "system", content: "Eres un asistente legal que hace preguntas de seguimiento inteligentes." },
        { role: "user", content: followUpPrompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
      stream: false
    })

    const content = response.choices?.[0]?.message?.content || "┬┐Hay alg├║n aspecto espec├¡fico que te gustar├¡a que profundice?"

    return {
      content,
      action: 'follow_up',
      metadata: {
        searchExecuted: false
      },
      memory: {
        messageId: `${this.options.chatId}-${Date.now()}`,
        timestamp: new Date()
      }
    }
  }

  /**
   * Genera respuesta usando contexto enriquecido
   */
  private async generateResponseWithContext(
    userQuery: string,
    searchContext: string,
    chatContext: ChatContext | null
  ): Promise<string> {
    const systemPrompt = `Eres un asistente legal experto en derecho colombiano. Utiliza EXCLUSIVAMENTE la informaci├│n proporcionada para responder la consulta del usuario.

${searchContext}

${chatContext ? `CONTEXTO DE CONVERSACI├ôN:
${chatContext.currentContext}` : ''}

INSTRUCCIONES:
1. Responde de manera completa y precisa
2. Usa terminolog├¡a jur├¡dica apropiada
3. Incluye referencias a art├¡culos y leyes cuando sea relevante
4. Proporciona informaci├│n pr├íctica y aplicable
5. Si hay informaci├│n insuficiente, ind├¡calo claramente
6. Responde en espa├▒ol colombiano`

    const response = await this.options.client.chat.completions.create({
      model: this.options.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Consulta: "${userQuery}"` }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      stream: false
    })

    return response.choices?.[0]?.message?.content || "No pude generar una respuesta adecuada."
  }

  /**
   * Parsea la decisi├│n del agente desde JSON
   */
  private parseAgentDecision(content: string): AgentDecision {
    try {
      const jsonText = this.extractJson(content)
      const parsed = JSON.parse(jsonText)
      
      return {
        action: parsed.action || 'search',
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'Sin razonamiento proporcionado',
        searchStrategy: parsed.searchStrategy || 'dynamic',
        searchQueries: parsed.searchQueries || [],
        maxRounds: parsed.maxRounds || this.options.maxSearchRounds
      }
    } catch (error) {
      console.error('Error parseando decisi├│n del agente:', error)
      return {
        action: 'search',
        confidence: 0.5,
        reasoning: 'Error parseando decisi├│n, usando fallback',
        searchStrategy: 'dynamic',
        searchQueries: [],
        maxRounds: this.options.maxSearchRounds
      }
    }
  }

  /**
   * Extrae JSON del contenido
   */
  private extractJson(content: string): string {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("JSON no encontrado en el contenido")
    }
    return content.slice(start, end + 1)
  }

  /**
   * Obtiene estad├¡sticas del agente
   */
  async getAgentStats(): Promise<{
    memoryEnabled: boolean
    agenticSearchEnabled: boolean
    maxSearchRounds: number
    chatStats: {
      totalMessages: number
      totalSearches: number
      averageQuality: number
      lastActivity: Date | null
    }
  }> {
    const chatStats = await this.memoryManager.getMemoryStats(
      this.options.chatId,
      this.options.userId
    )

    return {
      memoryEnabled: this.options.enableMemory,
      agenticSearchEnabled: this.options.enableAgenticSearch,
      maxSearchRounds: this.options.maxSearchRounds,
      chatStats
    }
  }
}










