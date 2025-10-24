/**
 * Constructor de prompts legales
 * Centraliza la construcción de prompts para el asistente legal
 */

export interface PromptContext {
  query: string
  sources?: any[]
  previousRounds?: any[]
  evidenceSummary?: any
  userPreferences?: any
  researchMode?: 'react' | 'iter_research' | 'hybrid'
}

export interface PromptTemplate {
  system: string
  user: string
  variables: string[]
}

/**
 * Templates de prompts legales
 */
export const LEGAL_PROMPT_TEMPLATES = {
  RESEARCH_PLANNING: {
    system: `Eres un asistente legal experto especializado en derecho colombiano. Tu tarea es crear un plan de investigación exhaustivo para consultas legales complejas.

Debes analizar la consulta y determinar:
1. Complejidad (simple, compleja, muy_compleja)
2. Número estimado de rondas de investigación
3. Áreas de investigación específicas
4. Consultas de búsqueda iniciales

Responde en formato JSON con la siguiente estructura:
{
  "complexity": "simple|compleja|muy_compleja",
  "estimatedRounds": number,
  "researchAreas": string[],
  "searchQueries": string[]
}`,
    user: "Consulta legal: {query}",
    variables: ['query']
  },

  SOURCE_VERIFICATION: {
    system: `Eres un experto en verificación de fuentes legales. Evalúa la calidad, autoridad y actualidad de las fuentes encontradas.

Para cada fuente, determina:
- authority: maxima|alta|media|baja|minima
- currency: actualizada|desactualizada|desconocida  
- recommendedUse: cita_principal|secundaria|contextual|no_usar
- verificationNotes: notas sobre la verificación

Responde en formato JSON:
{
  "sources": [
    {
      "verificationNotes": string,
      "authority": string,
      "currency": string,
      "recommendedUse": string
    }
  ]
}`,
    user: "Fuentes a verificar: {sources}",
    variables: ['sources']
  },

  INFORMATION_SUFFICIENCY: {
    system: `Eres un evaluador experto de suficiencia de información legal. Determina si la información recopilada es suficiente para responder la consulta.

Evalúa en estas dimensiones (0-20 puntos cada una):
- normativa: Cobertura de leyes, decretos, reglamentos
- jurisprudencia: Sentencias, precedentes judiciales
- doctrina: Análisis académico y doctrinal
- actualidad: Información actualizada y vigente
- verificacion: Calidad y confiabilidad de fuentes

Responde en formato JSON:
{
  "isSufficient": boolean,
  "confidence": number (0-1),
  "detailedScores": {
    "normativa": number,
    "jurisprudencia": number,
    "doctrina": number,
    "actualidad": number,
    "verificacion": number
  },
  "totalScore": number (0-100),
  "missingInfo": string[],
  "qualityIssues": string[],
  "needsMoreSearch": boolean,
  "additionalQueries": [
    {
      "query": string,
      "priority": "alta|media|baja",
      "reason": string
    }
  ]
}`,
    user: `Consulta: {query}
Fuentes: {sources}
Resumen de evidencia: {evidenceSummary}
Rondas anteriores: {previousRounds}`,
    variables: ['query', 'sources', 'evidenceSummary', 'previousRounds']
  },

  QUERY_GENERATION: {
    system: `Eres un experto en generación de consultas de búsqueda legal. Basándote en la consulta original y las fuentes ya encontradas, genera consultas adicionales específicas para llenar las brechas de información.

Genera consultas que:
- Sean específicas y enfocadas
- Busquen información faltante
- Usen términos legales precisos
- Incluyan sitios oficiales cuando sea apropiado

Responde en formato JSON:
{
  "additionalQueries": string[]
}`,
    user: `Consulta original: {query}
Fuentes actuales: {sources}
Número de rondas: {rounds}`,
    variables: ['query', 'sources', 'rounds']
  },

  FINAL_SYNTHESIS: {
    system: `Eres un asistente legal experto. Genera una síntesis final completa y profesional de la investigación realizada.

La síntesis debe incluir:
1. Respuesta directa a la consulta
2. Fundamentación legal con referencias específicas
3. Análisis de la normativa aplicable
4. Jurisprudencia relevante
5. Recomendaciones prácticas
6. Advertencias sobre limitaciones

Usa un tono profesional y preciso. Incluye referencias específicas a artículos, leyes y sentencias.`,
    user: `Consulta: {query}
Fuentes verificadas: {sources}
Rondas de investigación: {rounds}`,
    variables: ['query', 'sources', 'rounds']
  }
} as const

/**
 * Construye un prompt completo usando un template
 */
export function buildPrompt(
  template: PromptTemplate,
  context: PromptContext
): { system: string; user: string } {
  let userPrompt = template.user

  // Reemplazar variables en el prompt del usuario
  template.variables.forEach(variable => {
    const value = getContextValue(context, variable)
    userPrompt = userPrompt.replace(`{${variable}}`, value)
  })

  return {
    system: template.system,
    user: userPrompt
  }
}

/**
 * Obtiene un valor del contexto
 */
function getContextValue(context: PromptContext, variable: string): string {
  switch (variable) {
    case 'query':
      return context.query || ''
    case 'sources':
      return JSON.stringify(context.sources || [], null, 2)
    case 'previousRounds':
      return JSON.stringify(context.previousRounds?.length || 0)
    case 'evidenceSummary':
      return JSON.stringify(context.evidenceSummary || {}, null, 2)
    case 'rounds':
      return JSON.stringify(context.previousRounds?.length || 0)
    default:
      return ''
  }
}

/**
 * Construye un prompt de investigación
 */
export function buildResearchPrompt(query: string): { system: string; user: string } {
  return buildPrompt(LEGAL_PROMPT_TEMPLATES.RESEARCH_PLANNING, { query })
}

/**
 * Construye un prompt de verificación de fuentes
 */
export function buildSourceVerificationPrompt(sources: any[]): { system: string; user: string } {
  return buildPrompt(LEGAL_PROMPT_TEMPLATES.SOURCE_VERIFICATION, { 
    query: '', 
    sources 
  })
}

/**
 * Construye un prompt de evaluación de suficiencia
 */
export function buildSufficiencyPrompt(
  query: string,
  sources: any[],
  evidenceSummary: any,
  previousRounds: any[]
): { system: string; user: string } {
  return buildPrompt(LEGAL_PROMPT_TEMPLATES.INFORMATION_SUFFICIENCY, {
    query,
    sources,
    evidenceSummary,
    previousRounds
  })
}

/**
 * Construye un prompt de generación de consultas
 */
export function buildQueryGenerationPrompt(
  query: string,
  sources: any[],
  rounds: number
): { system: string; user: string } {
  return buildPrompt(LEGAL_PROMPT_TEMPLATES.QUERY_GENERATION, {
    query,
    sources,
    previousRounds: Array(rounds).fill(null)
  })
}

/**
 * Construye un prompt de síntesis final
 */
export function buildSynthesisPrompt(
  query: string,
  sources: any[],
  rounds: any[]
): { system: string; user: string } {
  return buildPrompt(LEGAL_PROMPT_TEMPLATES.FINAL_SYNTHESIS, {
    query,
    sources,
    previousRounds: rounds
  })
}

/**
 * Construye un prompt personalizado
 */
export function buildCustomPrompt(
  systemTemplate: string,
  userTemplate: string,
  context: Record<string, any>
): { system: string; user: string } {
  let systemPrompt = systemTemplate
  let userPrompt = userTemplate

  // Reemplazar variables en ambos prompts
  Object.entries(context).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    const stringValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    
    systemPrompt = systemPrompt.replace(new RegExp(placeholder, 'g'), stringValue)
    userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), stringValue)
  })

  return { system: systemPrompt, user: userPrompt }
}

/**
 * Valida que un prompt tenga todas las variables necesarias
 */
export function validatePrompt(template: PromptTemplate, context: PromptContext): boolean {
  return template.variables.every(variable => {
    const value = getContextValue(context, variable)
    return value !== ''
  })
}

