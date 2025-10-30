/**
 * Utilidades para procesar el stream devuelto por los agentes.
 * Extrae pasos de razonamiento, bloques de solicitud y documentos completos.
 */

export interface ReasoningStep {
  step: string
  description: string
  status: 'analyzing' | 'requirements' | 'gathering' | 'validating' | 'generating' | 'complete'
}

export interface PromptBlockItem {
  id: string
  name: string
  status: 'pending' | 'collected' | 'needs_search'
  description?: string
  legalBasis?: string
}

export interface PromptBlock {
  documentType: string
  headline: string
  referenceNote?: string
  items: PromptBlockItem[]
}

export interface ProcessedContent {
  text: string
  reasoningSteps: ReasoningStep[]
  isDocument: boolean
  documentContent?: string
  promptBlock?: PromptBlock
}

/**
 * Procesa el contenido acumulado del stream.
 */
export function processStreamContent(content: string): ProcessedContent {
  const reasoningSteps: ReasoningStep[] = []
  let text = content
  let isDocument = false
  let documentContent = ''
  let promptBlock: PromptBlock | undefined

  // Pasos de razonamiento
  const reasoningRegex = /\[REASONING:([^:]+):([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = reasoningRegex.exec(content)) !== null) {
    const [, status, description] = match
    reasoningSteps.push({
      step: match[0],
      description,
      status: status as ReasoningStep['status']
    })
    text = text.replace(match[0], '')
  }

  // Documentos completos
  const startIndex = content.indexOf('[DOCUMENT_START]')
  const endIndex = content.indexOf('[DOCUMENT_END]')
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    isDocument = true
    documentContent = content.substring(
      startIndex + '[DOCUMENT_START]'.length,
      endIndex
    ).trim()
    text = text.replace('[DOCUMENT_START]', '').replace('[DOCUMENT_END]', '')
  }

  // Bloques de solicitud
  const promptRegex = /\[PROMPT_BLOCK_START\]([\s\S]*?)\[PROMPT_BLOCK_END\]/
  const promptMatch = promptRegex.exec(content)
  if (promptMatch && promptMatch[1]) {
    const parsed = parsePromptBlock(promptMatch[1])
    if (parsed) {
      promptBlock = parsed
    }
    text = text.replace(promptRegex, '').trim()
  }

  // Limpieza final
  text = text.replace(/\[REASONING:([^:]+):([^\]]+)\]/g, '').trim()

  return {
    text,
    reasoningSteps,
    isDocument,
    documentContent,
    promptBlock
  }
}

/**
 * Acumula los fragmentos del stream para analizar el resultado completo.
 */
export function accumulateStreamContent(accumulated: string, newChunk: string): ProcessedContent {
  const fullContent = accumulated + newChunk
  return processStreamContent(fullContent)
}

function parsePromptBlock(rawPayload: string): PromptBlock | undefined {
  try {
    const payload = JSON.parse(rawPayload) as PromptBlock

    if (
      !payload ||
      typeof payload.documentType !== 'string' ||
      typeof payload.headline !== 'string' ||
      !Array.isArray(payload.items)
    ) {
      return undefined
    }

    const items: PromptBlockItem[] = payload.items
      .map(item => ({
        id: item?.id ?? '',
        name: item?.name ?? '',
        status: (item?.status ?? 'pending') as PromptBlockItem['status'],
        description: item?.description,
        legalBasis: item?.legalBasis
      }))
      .filter(item => item.id && item.name)

    return {
      documentType: payload.documentType,
      headline: payload.headline,
      referenceNote: payload.referenceNote,
      items
    }
  } catch (error) {
    console.warn('[stream-processor] No se pudo parsear el prompt block:', error)
    return undefined
  }
}