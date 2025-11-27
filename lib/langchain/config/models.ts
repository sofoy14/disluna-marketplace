/**
 * Configuración de Modelos LLM para LangChain
 * 
 * Define los modelos disponibles y sus capacidades.
 * Actualmente soporta:
 * - Kimi K2 (Thinking) - Moonshot
 * - Tongyi DeepResearch 30B A3B - Alibaba
 * 
 * Todos los modelos se acceden vía OpenRouter API.
 */

import { ChatOpenAI } from "@langchain/openai"

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS Y INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelConfig {
  id: string
  name: string
  provider: string
  description: string
  contextLength: number
  supportsTools: boolean
  supportsStreaming: boolean
  pricing: {
    input: number  // $ per 1M tokens
    output: number // $ per 1M tokens
  }
  capabilities: string[]
}

export type ModelId = 
  | 'moonshotai/kimi-k2'
  | 'alibaba/tongyi-deepresearch-30b-a3b'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-3-5-sonnet'

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRO DE MODELOS
// ═══════════════════════════════════════════════════════════════════════════════

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'moonshotai/kimi-k2': {
    id: 'moonshotai/kimi-k2',
    name: 'Kimi K2 Thinking',
    provider: 'Moonshot AI',
    description: 'Modelo de razonamiento avanzado con capacidades de pensamiento profundo y tool calling',
    contextLength: 131072,
    supportsTools: true,
    supportsStreaming: true,
    pricing: { input: 0.6, output: 2.5 },
    capabilities: [
      'deep-reasoning',
      'tool-calling',
      'code-generation',
      'multi-step-planning',
      'web-search'
    ]
  },
  'alibaba/tongyi-deepresearch-30b-a3b': {
    id: 'alibaba/tongyi-deepresearch-30b-a3b',
    name: 'Tongyi DeepResearch 30B',
    provider: 'Alibaba Tongyi Lab',
    description: 'Modelo MoE optimizado para investigación profunda, búsqueda agéntica y razonamiento multi-paso',
    contextLength: 131072,
    supportsTools: true,
    supportsStreaming: true,
    pricing: { input: 0.09, output: 0.40 },
    capabilities: [
      'deep-research',
      'agentic-search',
      'tool-calling',
      'react-reasoning',
      'multi-hop-reasoning',
      'long-context'
    ]
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Modelo eficiente con excelente relación costo-calidad para tool calling',
    contextLength: 128000,
    supportsTools: true,
    supportsStreaming: true,
    pricing: { input: 0.15, output: 0.60 },
    capabilities: [
      'tool-calling',
      'code-generation',
      'reasoning',
      'instruction-following'
    ]
  },
  'anthropic/claude-3-5-sonnet': {
    id: 'anthropic/claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Modelo balanceado con excelente comprensión y generación de texto',
    contextLength: 200000,
    supportsTools: true,
    supportsStreaming: true,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: [
      'tool-calling',
      'code-generation',
      'reasoning',
      'analysis',
      'long-context'
    ]
  }
}

// Modelos recomendados para investigación legal
export const RESEARCH_MODELS = [
  'moonshotai/kimi-k2',
  'alibaba/tongyi-deepresearch-30b-a3b'
] as const

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY DE MODELOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateModelOptions {
  modelId: ModelId | string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

/**
 * Crea una instancia de ChatOpenAI configurada para OpenRouter
 */
export function createModel(options: CreateModelOptions): ChatOpenAI {
  const { modelId, temperature = 0.3, maxTokens = 4096, streaming = true } = options
  
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no está configurada en las variables de entorno')
  }

  const modelConfig = MODEL_REGISTRY[modelId]
  if (!modelConfig) {
    console.warn(`⚠️ Modelo ${modelId} no está en el registro, usando configuración por defecto`)
  }

  return new ChatOpenAI({
    modelName: modelId,
    temperature,
    maxTokens,
    streaming,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
    },
    apiKey,
    // Headers adicionales para OpenRouter
    modelKwargs: {
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Asistente Legal Inteligente'
      }
    }
  })
}

/**
 * Verifica si un modelo soporta tool calling
 */
export function modelSupportsTools(modelId: string): boolean {
  const config = MODEL_REGISTRY[modelId]
  return config?.supportsTools ?? false
}

/**
 * Obtiene la configuración de un modelo
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY[modelId]
}

/**
 * Lista todos los modelos disponibles que soportan tools
 */
export function getToolCapableModels(): ModelConfig[] {
  return Object.values(MODEL_REGISTRY).filter(m => m.supportsTools)
}

