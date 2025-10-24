/**
 * Síntesis Unificada de Respuestas Legales
 * 
 * Este módulo consolida todas las funciones de síntesis de respuestas legales
 * en una función reutilizable que puede ser usada por diferentes orquestadores.
 */

import OpenAI from 'openai'
import { buildPrompt } from './prompt-builder'

// Tipos para la síntesis legal
export interface LegalSynthesisOptions {
  client: OpenAI
  model: string
  userQuery: string
  sources: LegalSource[]
  researchRounds?: ResearchRound[]
  synthesisType?: 'comprehensive' | 'brief' | 'detailed'
  includeMetadata?: boolean
  includeWarnings?: boolean
  temperature?: number
  maxTokens?: number
}

export interface LegalSource {
  title: string
  url: string
  content?: string
  snippet?: string
  type?: 'official' | 'academic' | 'news' | 'general'
  quality?: number
  authority?: 'maxima' | 'alta' | 'media' | 'baja' | 'minima'
  currency?: 'actualizada' | 'desactualizada' | 'desconocida'
  recommendedUse?: 'cita_principal' | 'secundaria' | 'contextual' | 'no_usar'
  verificationNotes?: string
}

export interface ResearchRound {
  roundNumber: number
  queries: string[]
  results: LegalSource[]
  durationMs: number
  sufficiencyEvaluation?: {
    isSufficient: boolean
    confidence: number
    totalScore: number
    missingInfo: string[]
    qualityIssues: string[]
  }
}

export interface LegalSynthesisResult {
  success: boolean
  content: string
  metadata?: {
    sourcesUsed: number
    highQualitySources: number
    officialSources: number
    averageQuality: number
    synthesisType: string
    processingTimeMs: number
    warnings?: string[]
    recommendations?: string[]
  }
  error?: string
}

// Plantillas de prompts para síntesis legal
const LEGAL_SYNTHESIS_COLOMBIA = `
Eres experto en derecho colombiano. Respuesta COMPLETA y PROFESIONAL.

CONSULTA: "{userQuery}"
FUENTES: {sourcesText}

ESTRUCTURA OBLIGATORIA:

## 1. RESPUESTA DIRECTA
[Respuesta clara en 2-3 líneas]

## 2. MARCO NORMATIVO
### Constitución Política 1991
[Artículos aplicables]
### Leyes y Decretos
[Normativa específica]

## 3. JURISPRUDENCIA
### Corte Constitucional
[Sentencias con ratio decidendi]
### Otras Cortes
[CSJ o CE si aplica]

## 4. ANÁLISIS
[Aplicación al caso]

## 5. CONCLUSIÓN
[Resumen ejecutivo]

## 6. FUENTES CONSULTADAS
[Lista con [TIPO] Título - URL]

⚖️ ADVERTENCIA: Información general. Consulte abogado para casos específicos.
`

const LEGAL_SYNTHESIS_TEMPLATES = {
  comprehensive: `
Eres un experto en derecho colombiano. Basándote en las siguientes fuentes verificadas, proporciona una respuesta legal completa, precisa y bien estructurada.

CONSULTA: "{userQuery}"

FUENTES VERIFICADAS:
{sourcesText}

INSTRUCCIONES COMPLETAS:
1. **ESTRUCTURA PROFESIONAL**:
   - Planteamiento jurídico claro y directo
   - Marco normativo completo con jerarquía
   - Jurisprudencia relevante con análisis
   - Doctrina especializada cuando aplique
   - Conclusiones precisas y fundamentadas

2. **PRECISIÓN JURÍDICA**:
   - Cita exacta de normas y artículos específicos
   - Verificación de vigencia de las normas
   - Jerarquía normativa clara (Constitución > Ley > Decreto)
   - Precedentes jurisprudenciales relevantes
   - Referencias doctrinales autorizadas

3. **COMPLETUD Y EXHAUSTIVIDAD**:
   - Todos los aspectos de la consulta cubiertos
   - Diferentes perspectivas jurídicas consideradas
   - Contradicciones normativas resueltas
   - Información actualizada y vigente
   - Aspectos procesales cuando aplique

4. **VERIFICACIÓN Y TRANSPARENCIA**:
   - Cada afirmación respaldada por fuente verificada
   - Enlaces directos a fuentes oficiales
   - Fecha de consulta de las fuentes
   - Estado de vigencia claramente indicado
   - Limitaciones o incertidumbres reconocidas

5. **LENGUAJE Y PRESENTACIÓN**:
   - Lenguaje jurídico preciso pero accesible
   - Estructura clara y organizada
   - Párrafos bien desarrollados
   - Uso correcto de términos técnicos
   - Formato profesional y legible

RESPUESTA LEGAL COMPLETA:`,

  brief: `
Eres un experto en derecho colombiano. Proporciona una respuesta legal concisa pero precisa basada en las fuentes verificadas.

CONSULTA: "{userQuery}"

FUENTES: {sourcesText}

INSTRUCCIONES:
1. Respuesta directa y clara a la consulta
2. Fundamentación con fuentes específicas
3. Citas de normas relevantes
4. Lenguaje jurídico preciso pero accesible
5. Estructura organizada y concisa

RESPUESTA LEGAL:`,

  detailed: `
Eres un experto en derecho colombiano. Proporciona una respuesta legal detallada y bien fundamentada.

CONSULTA: "{userQuery}"

FUENTES VERIFICADAS: {sourcesText}

INSTRUCCIONES DETALLADAS:
1. **ANÁLISIS JURÍDICO COMPLETO**:
   - Planteamiento del problema jurídico
   - Marco normativo aplicable
   - Jurisprudencia relevante
   - Doctrina especializada
   - Análisis de casos similares

2. **FUNDAMENTACIÓN ROBUSTA**:
   - Citas exactas de normas
   - Referencias jurisprudenciales
   - Análisis doctrinal
   - Interpretación sistemática
   - Conclusiones fundamentadas

3. **ESTRUCTURA PROFESIONAL**:
   - Introducción clara
   - Desarrollo sistemático
   - Análisis crítico
   - Conclusiones precisas
   - Referencias completas

RESPUESTA LEGAL DETALLADA:`
}

// Función principal de síntesis unificada
export async function synthesizeLegalResponse(
  options: LegalSynthesisOptions
): Promise<LegalSynthesisResult> {
  const {
    client,
    model,
    userQuery,
    sources,
    researchRounds = [],
    synthesisType = 'comprehensive',
    includeMetadata = true,
    includeWarnings = true,
    temperature = 0.2,
    maxTokens = 4000
  } = options

  const startTime = Date.now()

  try {
    console.log(`📝 Iniciando síntesis legal ${synthesisType} con ${sources.length} fuentes`)

    // Validar fuentes
    if (sources.length === 0) {
      return {
        success: false,
        content: 'No se encontraron fuentes suficientes para generar una respuesta legal.',
        error: 'Fuentes insuficientes'
      }
    }

    // Preparar texto de fuentes
    const sourcesText = formatSourcesForSynthesis(sources)
    
    // Seleccionar plantilla según tipo
    const template = synthesisType === 'comprehensive' && userQuery.toLowerCase().includes('colombia')
      ? LEGAL_SYNTHESIS_COLOMBIA
      : LEGAL_SYNTHESIS_TEMPLATES[synthesisType]
    const synthesisPrompt = template
      .replace('{userQuery}', userQuery)
      .replace('{sourcesText}', sourcesText)

    // Generar respuesta
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'Eres un experto en derecho colombiano especializado en análisis jurídico completo.' },
        { role: 'user', content: synthesisPrompt }
      ],
      temperature,
      max_tokens: maxTokens
    })

    const synthesizedContent = response.choices[0]?.message?.content || 
      'No se pudo generar una respuesta legal completa.'

    // Calcular metadatos
    const processingTime = Date.now() - startTime
    const metadata = includeMetadata ? calculateSynthesisMetadata(sources, researchRounds, synthesisType, processingTime) : undefined

    // Generar advertencias si es necesario
    const warnings = includeWarnings ? generateSynthesisWarnings(sources, researchRounds) : undefined

    console.log(`✅ Síntesis legal completada: ${synthesizedContent.length} caracteres en ${processingTime}ms`)

    return {
      success: true,
      content: synthesizedContent,
      metadata: {
        ...metadata,
        warnings
      }
    }

  } catch (error) {
    console.error('Error en síntesis legal:', error)
    const processingTime = Date.now() - startTime

    return {
      success: false,
      content: `Error generando respuesta legal: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      metadata: {
        sourcesUsed: sources.length,
        highQualitySources: 0,
        officialSources: 0,
        averageQuality: 0,
        synthesisType,
        processingTimeMs: processingTime,
        warnings: ['Error en síntesis automática']
      },
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Función auxiliar para formatear fuentes
function formatSourcesForSynthesis(sources: LegalSource[]): string {
  return sources.map((source, index) => {
    const content = source.content || source.snippet || 'Contenido no disponible'
    const quality = source.quality ? ` [Calidad: ${source.quality}/10]` : ''
    const authority = source.authority ? ` [Autoridad: ${source.authority}]` : ''
    const currency = source.currency ? ` [Vigencia: ${source.currency}]` : ''
    
    return `${index + 1}. ${source.title}${quality}${authority}${currency}
   URL: ${source.url}
   Contenido: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`
  }).join('\n\n')
}

// Función auxiliar para calcular metadatos
function calculateSynthesisMetadata(
  sources: LegalSource[],
  researchRounds: ResearchRound[],
  synthesisType: string,
  processingTime: number
) {
  const highQualitySources = sources.filter(s => (s.quality || 0) >= 7).length
  const officialSources = sources.filter(s => s.type === 'official').length
  const averageQuality = sources.length > 0 ? 
    sources.reduce((sum, s) => sum + (s.quality || 5), 0) / sources.length : 0

  const recommendations: string[] = []
  
  if (officialSources < 2) {
    recommendations.push('Considerar buscar más fuentes oficiales para mayor autoridad')
  }
  
  if (highQualitySources < 3) {
    recommendations.push('Incluir más fuentes de alta calidad para robustecer la respuesta')
  }
  
  if (averageQuality < 6) {
    recommendations.push('Verificar la calidad de las fuentes utilizadas')
  }

  return {
    sourcesUsed: sources.length,
    highQualitySources,
    officialSources,
    averageQuality: Math.round(averageQuality * 10) / 10,
    synthesisType,
    processingTimeMs: processingTime,
    recommendations: recommendations.length > 0 ? recommendations : undefined
  }
}

// Función auxiliar para generar advertencias
function generateSynthesisWarnings(sources: LegalSource[], researchRounds: ResearchRound[]): string[] {
  const warnings: string[] = []

  // Advertencias sobre fuentes
  const officialSources = sources.filter(s => s.type === 'official').length
  if (officialSources < 2) {
    warnings.push('Respuesta basada en pocas fuentes oficiales - verificar información')
  }

  const highQualitySources = sources.filter(s => (s.quality || 0) >= 7).length
  if (highQualitySources < 3) {
    warnings.push('Calidad de fuentes limitada - considerar consulta adicional')
  }

  // Advertencias sobre investigación
  if (researchRounds.length > 0) {
    const lastRound = researchRounds[researchRounds.length - 1]
    if (lastRound.sufficiencyEvaluation && !lastRound.sufficiencyEvaluation.isSufficient) {
      warnings.push('Investigación incompleta - algunos aspectos pueden requerir mayor profundidad')
    }
  }

  // Advertencias sobre vigencia
  const outdatedSources = sources.filter(s => s.currency === 'desactualizada').length
  if (outdatedSources > 0) {
    warnings.push(`${outdatedSources} fuentes pueden estar desactualizadas - verificar vigencia`)
  }

  return warnings
}

// Función de conveniencia para síntesis rápida
export async function quickLegalSynthesis(
  client: OpenAI,
  model: string,
  userQuery: string,
  sources: LegalSource[]
): Promise<string> {
  const result = await synthesizeLegalResponse({
    client,
    model,
    userQuery,
    sources,
    synthesisType: 'brief',
    includeMetadata: false,
    includeWarnings: false
  })

  return result.content
}

// Función de conveniencia para síntesis completa
export async function comprehensiveLegalSynthesis(
  client: OpenAI,
  model: string,
  userQuery: string,
  sources: LegalSource[],
  researchRounds?: ResearchRound[]
): Promise<LegalSynthesisResult> {
  return synthesizeLegalResponse({
    client,
    model,
    userQuery,
    sources,
    researchRounds,
    synthesisType: 'comprehensive',
    includeMetadata: true,
    includeWarnings: true
  })
}

// Función de conveniencia para síntesis detallada
export async function detailedLegalSynthesis(
  client: OpenAI,
  model: string,
  userQuery: string,
  sources: LegalSource[]
): Promise<LegalSynthesisResult> {
  return synthesizeLegalResponse({
    client,
    model,
    userQuery,
    sources,
    synthesisType: 'detailed',
    includeMetadata: true,
    includeWarnings: true
  })
}

