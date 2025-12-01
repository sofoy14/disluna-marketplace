/**
 * Sistema de búsqueda condicional inteligente
 * Solo busca en internet cuando es necesario información legal colombiana específica
 */

import { searchWithSerperSimple, formatSimpleSearchResults } from './simple-serper-search'

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTOR DE CONSULTAS LEGALES (antes en smart-legal-detector.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LegalDetectionResult {
  requiresWebSearch: boolean
  reason: string
  confidence: number
  category: 'legal' | 'general' | 'simple'
  suggestedQueries: string[]
}

/**
 * Detecta si una consulta requiere búsqueda web legal
 */
export function detectLegalQuery(query: string): LegalDetectionResult {
  const queryLower = query.toLowerCase().trim()
  
  // Palabras clave legales colombianas
  const legalKeywords = [
    // Normativa
    'ley', 'decreto', 'resolución', 'artículo', 'art.', 'código', 'norma', 'legislación',
    'constitución', 'constitucional', 'estatuto', 'reglamento',
    // Instituciones
    'corte', 'tribunal', 'juzgado', 'consejo de estado', 'corte suprema', 'corte constitucional',
    'superintendencia', 'ministerio', 'dian', 'procuraduría', 'contraloría', 'defensoría',
    // Procedimientos
    'tutela', 'demanda', 'proceso', 'procedimiento', 'trámite', 'recurso', 'apelación',
    'casación', 'revisión', 'nulidad', 'acción popular', 'acción de grupo',
    // Materias
    'penal', 'civil', 'comercial', 'laboral', 'administrativo', 'tributario', 'fiscal',
    'contencioso', 'disciplinario', 'constitucional',
    // Conceptos legales
    'prescripción', 'caducidad', 'término', 'plazo', 'competencia', 'jurisdicción',
    'derecho', 'obligación', 'responsabilidad', 'contrato', 'indemnización', 'daño',
    'perjuicio', 'culpa', 'dolo', 'negligencia', 'imprudencia',
    // Sentencias
    'sentencia', 'jurisprudencia', 'fallo', 'auto', 'providencia', 'concepto',
    // Específicos Colombia
    'colombia', 'colombiano', 'colombiana'
  ]
  
  // Patrones que indican consulta legal
  const legalPatterns = [
    /\b(art[íi]culo|art\.?)\s*\d+/i,           // Artículo 123
    /\b(ley|decreto|resoluci[oó]n)\s*\d+/i,   // Ley 1234
    /sentencia\s*(c|su|t|ac)-?\d+/i,          // Sentencia C-123
    /c[oó]digo\s+(civil|penal|comercial|laboral|procesal)/i, // Código civil
    /constituci[oó]n\s+pol[íi]tica/i,         // Constitución Política
    /\bcorte\s+(constitucional|suprema)/i,    // Corte Constitucional
    /\bconsejo\s+de\s+estado/i,               // Consejo de Estado
    /\bsuperintendencia/i,                     // Superintendencia
    /\brequisitos\s+para/i,                    // Requisitos para
    /\bc[oó]mo\s+(iniciar|presentar|interponer)/i, // Cómo iniciar/presentar
  ]
  
  // Consultas simples que NO requieren búsqueda
  const simplePatterns = [
    /^(hola|buenos\s+d[íi]as|buenas\s+tardes|buenas\s+noches)/i,
    /^(gracias|muchas\s+gracias)/i,
    /^(qu[eé]\s+tal|c[oó]mo\s+est[aá]s?)/i,
    /^(ok|entendido|perfecto|de\s+acuerdo)/i
  ]
  
  // Verificar si es consulta simple
  if (simplePatterns.some(pattern => pattern.test(queryLower))) {
    return {
      requiresWebSearch: false,
      reason: 'Consulta de saludo o confirmación simple',
      confidence: 0.95,
      category: 'simple',
      suggestedQueries: []
    }
  }
  
  // Verificar patrones legales específicos
  const matchedPatterns = legalPatterns.filter(pattern => pattern.test(query))
  if (matchedPatterns.length > 0) {
    return {
      requiresWebSearch: true,
      reason: `Patrón legal detectado: consulta sobre normativa/jurisprudencia específica`,
      confidence: 0.95,
      category: 'legal',
      suggestedQueries: [query + ' Colombia', query + ' Colombia site:gov.co']
    }
  }
  
  // Contar palabras clave legales
  const keywordMatches = legalKeywords.filter(keyword => queryLower.includes(keyword))
  const keywordCount = keywordMatches.length
  
  if (keywordCount >= 3) {
    return {
      requiresWebSearch: true,
      reason: `Alta densidad de términos legales (${keywordCount} términos)`,
      confidence: 0.9,
      category: 'legal',
      suggestedQueries: [query + ' Colombia derecho legal']
    }
  }
  
  if (keywordCount >= 1) {
    return {
      requiresWebSearch: true,
      reason: `Términos legales detectados: ${keywordMatches.slice(0, 3).join(', ')}`,
      confidence: 0.7 + (keywordCount * 0.05),
      category: 'legal',
      suggestedQueries: [query + ' Colombia']
    }
  }
  
  // Consulta general - no requiere búsqueda legal específica
  return {
    requiresWebSearch: false,
    reason: 'No se detectaron términos legales específicos',
    confidence: 0.6,
    category: 'general',
    suggestedQueries: []
  }
}

/**
 * Log de detección legal para debugging
 */
export function logLegalDetection(query: string, result: LegalDetectionResult): void {
  console.log(`\n🔍 DETECCIÓN LEGAL`)
  console.log(`   Query: "${query.substring(0, 60)}..."`)
  console.log(`   Requiere búsqueda: ${result.requiresWebSearch ? '✅ SÍ' : '❌ NO'}`)
  console.log(`   Categoría: ${result.category}`)
  console.log(`   Confianza: ${(result.confidence * 100).toFixed(1)}%`)
  console.log(`   Razón: ${result.reason}`)
  if (result.suggestedQueries.length > 0) {
    console.log(`   Queries sugeridas: ${result.suggestedQueries.join(', ')}`)
  }
}

interface QueryComplexity {
  level: 'simple' | 'moderate' | 'complex'
  score: number
  factors: string[]
}

/**
 * Determina la complejidad de una consulta legal
 */
function determineQueryComplexity(query: string, detectionResult: LegalDetectionResult): QueryComplexity {
  const factors: string[] = []
  let score = 0
  
  const queryLower = query.toLowerCase()
  
  // Factores de complejidad
  if (queryLower.includes('artículo') || queryLower.includes('art.')) {
    factors.push('artículo específico')
    score += 1
  }
  
  if (queryLower.includes('código') || queryLower.includes('ley')) {
    factors.push('norma específica')
    score += 1
  }
  
  if (queryLower.includes('jurisprudencia') || queryLower.includes('sentencia')) {
    factors.push('jurisprudencia')
    score += 2
  }
  
  if (queryLower.includes('corte constitucional') || queryLower.includes('corte suprema')) {
    factors.push('tribunal específico')
    score += 2
  }
  
  if (queryLower.includes('proceso') || queryLower.includes('procedimiento')) {
    factors.push('proceso legal')
    score += 1
  }
  
  if (queryLower.includes('contrato') || queryLower.includes('responsabilidad')) {
    factors.push('materia específica')
    score += 1
  }
  
  if (queryLower.includes('prescripción') || queryLower.includes('caducidad')) {
    factors.push('términos legales')
    score += 1
  }
  
  // Longitud de la consulta
  if (query.length > 100) {
    factors.push('consulta extensa')
    score += 1
  }
  
  // Determinar nivel de complejidad
  let level: 'simple' | 'moderate' | 'complex'
  if (score <= 1) {
    level = 'simple'
  } else if (score <= 3) {
    level = 'moderate'
  } else {
    level = 'complex'
  }
  
  return { level, score, factors }
}

/**
 * Obtiene el número adaptativo de resultados basado en la complejidad
 */
function getAdaptiveSearchCount(complexity: QueryComplexity): number {
  switch (complexity.level) {
    case 'simple':
      return 2 // Consultas simples: 2 resultados
    case 'moderate':
      return 3 // Consultas moderadas: 3 resultados
    case 'complex':
      return 5 // Consultas complejas: 5 resultados
    default:
      return 3 // Por defecto: 3 resultados
  }
}

// Función para formatear resultados de búsqueda para contexto
function formatSearchResultsForContext(searchResults: any): string {
  if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
    return 'No se encontraron resultados específicos en internet para esta consulta.'
  }

  const formattedResults = searchResults.results.map((result: any, index: number) => {
    return `${index + 1}. **${result.title}**
   URL: ${result.url}
   Contenido: ${result.snippet || result.content || 'Sin contenido disponible'}
   
`
  }).join('\n')

  return `**INFORMACIÓN ENCONTRADA EN INTERNET:**

${formattedResults}

**FUENTES CONSULTADAS:**
${searchResults.results.map((result: any, index: number) => `${index + 1}. [${result.title}](${result.url})`).join('\n')}`
}

export interface ConditionalSearchResult {
  shouldSearch: boolean
  searchResults?: any
  webSearchContext: string
  detectionResult: LegalDetectionResult
}

/**
 * Ejecuta búsqueda web solo si es necesario según análisis inteligente
 */
export async function executeConditionalWebSearch(
  userQuery: string,
  options: {
    forceSearch?: boolean
    logDetection?: boolean
  } = {}
): Promise<ConditionalSearchResult> {
  
  // 1. Analizar si la consulta requiere búsqueda web
  const detectionResult = detectLegalQuery(userQuery)
  
  // 2. Logging opcional
  if (options.logDetection !== false) {
    logLegalDetection(userQuery, detectionResult)
  }
  
  // 3. Forzar búsqueda si se especifica (para testing)
  const shouldSearch = options.forceSearch || detectionResult.requiresWebSearch
  
  if (!shouldSearch) {
    return {
      shouldSearch: false,
      webSearchContext: generateNoSearchContext(detectionResult),
      detectionResult
    }
  }
  
  // 4. Ejecutar búsqueda web adaptativa con Serper
  console.log(`🔍 Ejecutando búsqueda web adaptativa con Serper...`)
  
  // Determinar número de resultados basado en la complejidad de la consulta
  const queryComplexity = determineQueryComplexity(userQuery, detectionResult)
  const numResults = getAdaptiveSearchCount(queryComplexity)
  
  console.log(`📊 Complejidad: ${queryComplexity.level} - Resultados: ${numResults}`)
  
  try {
    const searchResults = await searchWithSerperSimple(userQuery, numResults)
    
    if (searchResults && searchResults.success && searchResults.results && searchResults.results.length > 0) {
      const webSearchContext = formatSimpleSearchResults(searchResults)
      
      console.log(`✅ Búsqueda exitosa: ${searchResults.results.length} resultados encontrados (${searchResults.searchEngine})`)
      console.log(`📊 Factores de complejidad: ${queryComplexity.factors.join(', ')}`)
      
      return {
        shouldSearch: true,
        searchResults,
        webSearchContext,
        detectionResult
      }
    } else {
      console.log(`⚠️ Búsqueda sin resultados específicos`)
      
      return {
        shouldSearch: true,
        searchResults: null,
        webSearchContext: generateNoResultsContext(detectionResult),
        detectionResult
      }
    }
  } catch (error) {
    console.error(`❌ Error en búsqueda web:`, error)
    
    return {
      shouldSearch: true,
      searchResults: null,
      webSearchContext: generateErrorContext(error, detectionResult),
      detectionResult
    }
  }
}

/**
 * Genera contexto cuando no se requiere búsqueda
 */
function generateNoSearchContext(detectionResult: LegalDetectionResult): string {
  return `🧠 ANÁLISIS INTELIGENTE COMPLETADO

✅ DECISIÓN: No se requiere búsqueda web
📋 Razón: ${detectionResult.reason}
🎯 Confianza: ${(detectionResult.confidence * 100).toFixed(1)}%

Esta consulta no requiere información legal específica de internet.
Puedes responder basándote en tu conocimiento general.`
}

/**
 * Genera contexto cuando la búsqueda no encuentra resultados
 */
function generateNoResultsContext(detectionResult: LegalDetectionResult): string {
  return `🔍 BÚSQUEDA WEB EJECUTADA - SIN RESULTADOS ESPECÍFICOS

✅ DECISIÓN: Búsqueda web ejecutada según análisis inteligente
📋 Razón: ${detectionResult.reason}
🎯 Confianza: ${(detectionResult.confidence * 100).toFixed(1)}%

⚠️ RESULTADO: La búsqueda no encontró información específica adicional.

INSTRUCCIONES:
1. **MENCIONA** que se ejecutó una búsqueda web inteligente
2. **Responde** basándote en tu conocimiento legal
3. **NO incluyas** bibliografía web (no hay URLs válidas)
4. **Explica** que la búsqueda no encontró fuentes específicas adicionales`
}

/**
 * Genera contexto cuando hay error en la búsqueda
 */
function generateErrorContext(error: any, detectionResult: LegalDetectionResult): string {
  return `❌ BÚSQUEDA WEB CON ERROR

✅ DECISIÓN: Búsqueda web intentada según análisis inteligente
📋 Razón: ${detectionResult.reason}
🎯 Confianza: ${(detectionResult.confidence * 100).toFixed(1)}%

❌ ERROR: ${error instanceof Error ? error.message : 'Error desconocido'}

INSTRUCCIONES:
1. **MENCIONA** que se intentó una búsqueda web pero hubo un error técnico
2. **Responde** basándote en tu conocimiento legal
3. **NO incluyas** bibliografía web
4. **Explica** que hubo un problema técnico con la búsqueda`
}

/**
 * Genera el mensaje de sistema apropiado basado en el resultado de búsqueda condicional
 */
export function generateSystemMessage(
  userQuery: string,
  searchResult: ConditionalSearchResult
): string {
  
  if (!searchResult.shouldSearch) {
    return `Eres un asistente legal especializado en derecho colombiano.

🧠 BÚSQUEDA WEB INTELIGENTE - NO REQUERIDA

${searchResult.webSearchContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Responde en español colombiano con terminología jurídica precisa.

JERARQUÍA LEGAL COLOMBIANA (ESTRICTA):
1. Bloque de Constitucionalidad (Constitución 1991 + Tratados DDHH).
2. Leyes (Estatutarias > Orgánicas > Ordinarias).
3. Decretos y Actos Administrativos.
4. Jurisprudencia (Corte Constitucional > CSJ/Consejo de Estado).

IMPORTANTE:
- Prioriza siempre la jurisprudencia vigente y unificada.
- Verifica la vigencia de las normas citadas.
- Usa terminología jurídica colombiana exacta.
- No menciones búsqueda web ya que no fue necesaria.`
  }
  
  // Si se ejecutó búsqueda, generar mensaje apropiado según el resultado
  if (searchResult.searchResults && searchResult.searchResults.success) {
    const complexity = determineQueryComplexity(userQuery, searchResult.detectionResult)
    const numResults = searchResult.searchResults.results?.length || 0
    
    return `Eres un asistente legal especializado en derecho colombiano.

🔍 BÚSQUEDA WEB ADAPTATIVA EJECUTADA

📊 Complejidad de consulta: ${complexity.level.toUpperCase()}
🎯 Resultados obtenidos: ${numResults} (adaptados a la complejidad)
📋 Factores detectados: ${complexity.factors.join(', ') || 'ninguno'}

${searchResult.webSearchContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**OBLIGATORIO**: Menciona que se ejecutó una búsqueda web adaptativa en tu respuesta.

Responde en español colombiano con terminología jurídica precisa.

JERARQUÍA LEGAL COLOMBIANA (ESTRICTA):
1. Bloque de Constitucionalidad (Constitución 1991 + Tratados DDHH).
2. Leyes (Estatutarias > Orgánicas > Ordinarias).
3. Decretos y Actos Administrativos.
4. Jurisprudencia (Corte Constitucional > CSJ/Consejo de Estado).

IMPORTANTE:
- Prioriza siempre la jurisprudencia vigente y unificada.
- Verifica la vigencia de las normas citadas.
- Usa terminología jurídica colombiana exacta.``
  } else {
    return `Eres un asistente legal especializado en derecho colombiano.

🔍 BÚSQUEDA WEB INTELIGENTE EJECUTADA - SIN RESULTADOS

${searchResult.webSearchContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**OBLIGATORIO**: Menciona que se ejecutó una búsqueda web inteligente en tu respuesta.

Responde en español colombiano con terminología jurídica precisa.

JERARQUÍA LEGAL COLOMBIANA (ESTRICTA):
1. Bloque de Constitucionalidad (Constitución 1991 + Tratados DDHH).
2. Leyes (Estatutarias > Orgánicas > Ordinarias).
3. Decretos y Actos Administrativos.
4. Jurisprudencia (Corte Constitucional > CSJ/Consejo de Estado).

IMPORTANTE:
- Prioriza siempre la jurisprudencia vigente y unificada.
- Verifica la vigencia de las normas citadas.
- Usa terminología jurídica colombiana exacta.``
  }
}

/**
 * Función de utilidad para testing
 */
export function testLegalDetection(queries: string[]): void {
  console.log(`\n🧪 TESTING DETECTOR LEGAL INTELIGENTE`)
  console.log(`${'='.repeat(80)}`)
  
  queries.forEach((query, index) => {
    console.log(`\n${index + 1}. "${query}"`)
    const result = detectLegalQuery(query)
    logLegalDetection(query, result)
  })
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`✅ Testing completado`)
}
