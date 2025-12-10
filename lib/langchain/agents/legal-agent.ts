/**
 * Agente Legal Principal con LangChain
 * 
 * Implementa un agente con tool calling nativo que:
 * - Soporta múltiples modelos (Kimi K2, Tongyi, GPT-4o, Claude)
 * - Decide autónomamente cuándo usar herramientas
 * - Mantiene contexto de conversación
 * - Es completamente extensible
 */

import { AgentExecutor, createToolCallingAgent } from "langchain/agents"
import { ChatOpenAI } from "@langchain/openai"
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"

import { createModel, ModelId, getModelConfig } from "../config/models"
import { LEGAL_AGENT_SYSTEM_PROMPT } from "../config/prompts"
import { ALL_TOOLS, getToolsByNames } from "../tools"
import { StructuredTool } from "@langchain/core/tools"

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgentConfig {
  modelId: ModelId | string
  temperature?: number
  maxIterations?: number
  verbose?: boolean
  tools?: string[] | StructuredTool[] // Nombres de tools o instancias de tools
}

export interface AgentInput {
  input: string
  chatHistory?: BaseMessage[]
}

export interface AgentResponse {
  output: string
  intermediateSteps?: any[]
  sources?: Array<{ title: string; url: string }>
  toolsUsed?: string[]
  metadata?: {
    model: string
    iterations: number
    processingTime: number
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASE DEL AGENTE LEGAL
// ═══════════════════════════════════════════════════════════════════════════════

export class LegalAgent {
  private executor: AgentExecutor
  private model: ChatOpenAI
  private config: AgentConfig
  private chatHistory: BaseMessage[] = []

  private constructor(executor: AgentExecutor, model: ChatOpenAI, config: AgentConfig) {
    this.executor = executor
    this.model = model
    this.config = config
  }

  /**
   * Crea una nueva instancia del agente legal
   */
  static async create(config: AgentConfig): Promise<LegalAgent> {
    const { 
      modelId, 
      temperature = 0.3, 
      maxIterations = 10, // Aumentado de 6 a 10 para consultas legales complejas
      verbose = false,
      tools: toolNames
    } = config

    console.log(`\n🤖 Creando Agente Legal con modelo: ${modelId}`)

    // Verificar que el modelo soporte tools
    const modelConfig = getModelConfig(modelId)
    if (modelConfig && !modelConfig.supportsTools) {
      throw new Error(`El modelo ${modelId} no soporta tool calling`)
    }

    // Crear el modelo LLM
    const model = createModel({
      modelId,
      temperature,
      maxTokens: 4096,
      streaming: true
    })

    // Seleccionar herramientas
    let tools: StructuredTool[]
    if (toolNames) {
      if (Array.isArray(toolNames) && toolNames.length > 0 && typeof toolNames[0] === 'string') {
        // Si son nombres de herramientas, obtenerlas por nombre
        tools = getToolsByNames(toolNames as string[])
      } else {
        // Si son instancias de herramientas, usarlas directamente
        tools = toolNames as StructuredTool[]
      }
    } else {
      tools = ALL_TOOLS
    }
    console.log(`🔧 Herramientas cargadas: ${tools.map(t => t.name).join(', ')}`)

    // Crear el prompt del agente
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", LEGAL_AGENT_SYSTEM_PROMPT],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ])

    // Crear el agente con tool calling
    const agent = await createToolCallingAgent({
      llm: model,
      tools,
      prompt,
    })

    // Crear el ejecutor del agente
    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations,
      verbose,
      returnIntermediateSteps: true,
      handleParsingErrors: true,
      // Importante: cuando se alcance el límite de iteraciones, generar respuesta parcial
      // en lugar de lanzar error "Agent stopped due to max iterations"
      earlyStoppingMethod: "generate",
    })

    console.log(`✅ Agente Legal creado exitosamente`)

    return new LegalAgent(executor, model, config)
  }

  /**
   * Ejecuta una consulta al agente
   */
  async invoke(input: AgentInput): Promise<AgentResponse> {
    const startTime = Date.now()
    
    console.log(`\n${'═'.repeat(70)}`)
    console.log(`🧠 LEGAL AGENT - PROCESANDO CONSULTA`)
    console.log(`${'═'.repeat(70)}`)
    console.log(`📝 Input: "${input.input.substring(0, 100)}..."`)
    console.log(`🤖 Modelo: ${this.config.modelId}`)
    console.log(`💬 Historial: ${(input.chatHistory || this.chatHistory).length} mensajes`)

    try {
      // Usar historial proporcionado o el interno
      const history = input.chatHistory || this.chatHistory

      // Ejecutar el agente
      const result = await this.executor.invoke({
        input: input.input,
        chat_history: history
      })

      const processingTime = Date.now() - startTime

      // Extraer información de los pasos intermedios
      const toolsUsed = this.extractToolsUsed(result.intermediateSteps || [])
      const sources = this.extractSourcesFromSteps(result.intermediateSteps || [], result.output)

      // Actualizar historial interno
      this.chatHistory.push(new HumanMessage(input.input))
      this.chatHistory.push(new AIMessage(result.output))

      console.log(`\n${'─'.repeat(70)}`)
      console.log(`✅ RESPUESTA COMPLETADA`)
      console.log(`   ⏱️ Tiempo: ${(processingTime / 1000).toFixed(1)}s`)
      console.log(`   🔧 Tools usadas: ${toolsUsed.length > 0 ? toolsUsed.join(', ') : 'Ninguna'}`)
      console.log(`   📚 Fuentes: ${sources.length}`)
      console.log(`${'═'.repeat(70)}\n`)

      return {
        output: result.output,
        intermediateSteps: result.intermediateSteps,
        sources,
        toolsUsed,
        metadata: {
          model: this.config.modelId,
          iterations: result.intermediateSteps?.length || 0,
          processingTime
        }
      }

    } catch (error: any) {
      console.error(`❌ Error en el agente:`, error)
      
      // Manejar específicamente el error de max iterations
      if (error.message?.includes('max iterations') || error.message?.includes('Agent stopped')) {
        console.warn(`⚠️ Agente alcanzó límite de iteraciones, generando respuesta parcial...`)
        
        return {
          output: "He recopilado información relevante pero la consulta requiere más investigación de la que puedo completar en este momento. " +
                  "Te recomiendo dividir tu pregunta en consultas más específicas para obtener respuestas más detalladas. " +
                  "También puedes consultar directamente las fuentes oficiales como la Corte Constitucional (corteconstitucional.gov.co) " +
                  "o la Secretaría del Senado (secretariasenado.gov.co).",
          intermediateSteps: [],
          sources: [],
          toolsUsed: [],
          metadata: {
            model: this.config.modelId,
            iterations: this.config.maxIterations || 6,
            processingTime: Date.now() - startTime
          }
        }
      }
      
      throw error
    }
  }

  /**
   * Ejecuta una consulta con streaming
   */
  async *stream(input: AgentInput): AsyncGenerator<string> {
    console.log(`\n🔄 Iniciando streaming para: "${input.input.substring(0, 50)}..."`)

    const history = input.chatHistory || this.chatHistory

    try {
      const stream = await this.executor.stream({
        input: input.input,
        chat_history: history
      })

      let fullOutput = ''

      for await (const chunk of stream) {
        // El chunk puede contener diferentes tipos de datos
        if (chunk.output) {
          yield chunk.output
          fullOutput = chunk.output
        } else if (chunk.intermediateSteps) {
          // Información sobre pasos intermedios (tools llamadas)
          for (const step of chunk.intermediateSteps) {
            console.log(`🔧 Tool: ${step.action?.tool} -> ${step.observation?.substring(0, 100)}...`)
          }
        }
      }

      // Actualizar historial después del streaming
      this.chatHistory.push(new HumanMessage(input.input))
      this.chatHistory.push(new AIMessage(fullOutput))

    } catch (error) {
      console.error(`❌ Error en streaming:`, error)
      throw error
    }
  }

  /**
   * Limpia el historial de conversación
   */
  clearHistory(): void {
    this.chatHistory = []
    console.log('🧹 Historial de conversación limpiado')
  }

  /**
   * Obtiene el historial actual
   */
  getHistory(): BaseMessage[] {
    return [...this.chatHistory]
  }

  /**
   * Extrae las herramientas usadas de los pasos intermedios
   */
  private extractToolsUsed(steps: any[]): string[] {
    const tools = new Set<string>()
    for (const step of steps) {
      if (step.action?.tool) {
        tools.add(step.action.tool)
      }
    }
    return Array.from(tools)
  }

  /**
   * Extrae fuentes de los pasos intermedios (resultados de tools) y del output
   */
  private extractSourcesFromSteps(
    steps: any[], 
    output: string
  ): Array<{ title: string; url: string }> {
    const sources: Array<{ title: string; url: string }> = []
    const seenUrls = new Set<string>()

    // PASO 1: Extraer fuentes de los resultados de las herramientas
    for (const step of steps) {
      try {
        const observation = step.observation
        if (typeof observation === 'string') {
          // Intentar parsear como JSON (los resultados de search_legal_official son JSON)
          try {
            const parsed = JSON.parse(observation)
            if (parsed.results && Array.isArray(parsed.results)) {
              for (const result of parsed.results) {
                if (result.url && !seenUrls.has(result.url)) {
                  seenUrls.add(result.url)
                  sources.push({
                    title: result.title || this.extractTitleFromUrl(result.url),
                    url: result.url
                  })
                }
              }
            }
          } catch {
            // No es JSON, buscar URLs directamente
            const urlMatches = observation.match(/https?:\/\/[^\s\)\]\>"]+/g) || []
            for (const url of urlMatches) {
              const cleanUrl = url.replace(/[,.\]}]+$/, '') // Limpiar caracteres finales
              if (!seenUrls.has(cleanUrl)) {
                seenUrls.add(cleanUrl)
                sources.push({
                  title: this.extractTitleFromUrl(cleanUrl),
                  url: cleanUrl
                })
              }
            }
          }
        }
      } catch (e) {
        console.log('Error extrayendo fuentes de step:', e)
      }
    }

    // PASO 2: Si no hay fuentes de las tools, buscar en el output
    if (sources.length === 0) {
      const urlRegex = /https?:\/\/[^\s\)\]\>"]+/g
      const urls = output.match(urlRegex) || []

      for (const url of urls) {
        const cleanUrl = url.replace(/[,.\]}]+$/, '')
        if (!seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl)
          sources.push({
            title: this.extractTitleFromUrl(cleanUrl),
            url: cleanUrl
          })
        }
      }
    }

    // Limitar a máximo 10 fuentes
    return sources.slice(0, 10)
  }

  /**
   * Extrae un título legible de una URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.replace('www.', '')
      
      // Mapeo de dominios conocidos a nombres legibles
      const domainNames: Record<string, string> = {
        'secretariasenado.gov.co': 'Secretaría del Senado',
        'corteconstitucional.gov.co': 'Corte Constitucional',
        'consejodeestado.gov.co': 'Consejo de Estado',
        'suin-juriscol.gov.co': 'SUIN-Juriscol',
        'funcionpublica.gov.co': 'Función Pública',
        'dian.gov.co': 'DIAN',
        'minjusticia.gov.co': 'MinJusticia',
        'procuraduria.gov.co': 'Procuraduría',
        'defensoria.gov.co': 'Defensoría del Pueblo',
        'ramajudicial.gov.co': 'Rama Judicial',
      }

      // Buscar coincidencia parcial
      for (const [domain, name] of Object.entries(domainNames)) {
        if (hostname.includes(domain.split('.')[0])) {
          return name
        }
      }

      return hostname
    } catch {
      return 'Fuente legal'
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte mensajes de conversación al formato de LangChain
 */
export function convertToLangChainMessages(messages: ConversationMessage[]): BaseMessage[] {
  return messages.map(msg => {
    switch (msg.role) {
      case 'user':
        return new HumanMessage(msg.content)
      case 'assistant':
        return new AIMessage(msg.content)
      case 'system':
        return new SystemMessage(msg.content)
      default:
        return new HumanMessage(msg.content)
    }
  })
}

/**
 * Crea un agente con configuración por defecto para investigación legal
 */
export async function createDefaultLegalAgent(modelId?: string): Promise<LegalAgent> {
  return LegalAgent.create({
    modelId: modelId || 'alibaba/tongyi-deepresearch-30b-a3b',
    temperature: 0.3,
    maxIterations: 10,
    verbose: process.env.NODE_ENV === 'development'
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export default LegalAgent

