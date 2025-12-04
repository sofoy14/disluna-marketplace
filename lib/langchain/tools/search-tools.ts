/**
 * Herramientas de Búsqueda para el Agente Legal
 * 
 * Implementa las herramientas de búsqueda usando:
 * - Serper API para búsquedas en Google
 * - Filtros específicos para fuentes colombianas
 * 
 * Estas tools son compatibles con LangChain y soportan
 * tool calling nativo.
 */

import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
  type: 'official' | 'academic' | 'general'
  score: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BÚSQUEDA BASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clasifica el tipo de fuente basándose en la URL
 */
function classifySourceType(url: string): 'official' | 'academic' | 'general' {
  const urlLower = url.toLowerCase()
  
  // Fuentes oficiales colombianas
  const officialDomains = [
    '.gov.co',
    'corteconstitucional.gov.co',
    'consejodeestado.gov.co',
    'cortesuprema.gov.co',
    'suin-juriscol.gov.co',
    'secretariasenado.gov.co',
    'funcionpublica.gov.co',
    'ramajudicial.gov.co',
    'imprenta.gov.co',
    'minjusticia.gov.co',
    'procuraduria.gov.co',
    'contraloria.gov.co',
    'fiscalia.gov.co',
    'defensoria.gov.co',
    'superfinanciera.gov.co',
    'dian.gov.co'
  ]
  
  if (officialDomains.some(domain => urlLower.includes(domain))) {
    return 'official'
  }
  
  // Fuentes académicas
  const academicDomains = [
    '.edu.co',
    'uexternado.edu.co',
    'unal.edu.co',
    'javeriana.edu.co',
    'losandes.edu.co',
    'icesi.edu.co',
    'redalyc.org',
    'scielo'
  ]
  
  if (academicDomains.some(domain => urlLower.includes(domain))) {
    return 'academic'
  }
  
  return 'general'
}

/**
 * Calcula score de la fuente (mayor = mejor)
 */
function scoreSource(url: string): number {
  const type = classifySourceType(url)
  switch (type) {
    case 'official': return 10
    case 'academic': return 7
    default: return 4
  }
}

/**
 * Ejecuta búsqueda usando Serper API
 */
async function executeSerperSearch(
  query: string, 
  numResults: number = 5,
  siteFilter?: string
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  
  if (!apiKey) {
    console.error('❌ SERPER_API_KEY no configurada')
    throw new Error('SERPER_API_KEY no configurada en variables de entorno')
  }

  // Construir query con filtro de sitio si se especifica
  let finalQuery = query
  if (siteFilter) {
    finalQuery = `${query} ${siteFilter}`
  }

  console.log(`🔍 Serper Search: "${finalQuery}" (${numResults} resultados)`)

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: finalQuery,
        num: numResults,
        gl: "co", // Colombia
        hl: "es"  // Español
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Serper API error ${response.status}: ${errorText.substring(0, 200)}`)
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    const organic = data.organic || []

    console.log(`✅ Serper: ${organic.length} resultados encontrados`)

    return organic.map((item: any) => ({
      title: item.title || 'Sin título',
      url: item.link || '',
      snippet: item.snippet || 'Sin descripción',
      type: classifySourceType(item.link || ''),
      score: scoreSource(item.link || '')
    }))

  } catch (error) {
    console.error(`❌ Error en Serper Search:`, error)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTAS DE LANGCHAIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Herramienta: Búsqueda en Fuentes Legales Oficiales
 */
export const searchLegalOfficialTool = new DynamicStructuredTool({
  name: "search_legal_official",
  description: `OBLIGATORIO para consultas legales. Busca información en fuentes oficiales colombianas: 
- Corte Constitucional
- Consejo de Estado  
- Corte Suprema de Justicia
- SUIN-Juriscol
- Secretaría del Senado
- Ministerios y Superintendencias

Usa esta herramienta PRIMERO para cualquier pregunta sobre leyes, decretos, sentencias, jurisprudencia o normatividad colombiana.`,
  schema: z.object({
    query: z.union([
      z.string(),
      z.array(z.string())
    ]).describe("Consulta de búsqueda legal. Puede ser un string o un array de strings. Ejemplo: 'prescripción adquisitiva código civil'"),
    maxResults: z.number().nullable().optional().default(5).describe("Número máximo de resultados (default: 5)")
  }),
  func: async ({ query, maxResults }) => {
    // Normalizar query: si es array, usar el primer elemento o unirlos
    const normalizedQuery = Array.isArray(query) ? query[0] : query
    
    console.log(`🏛️ [TOOL] search_legal_official: "${normalizedQuery}"`)
    
    try {
      // Filtro para sitios oficiales colombianos
      const siteFilter = 'site:gov.co OR site:corteconstitucional.gov.co OR site:consejodeestado.gov.co OR site:suin-juriscol.gov.co OR site:secretariasenado.gov.co'
      
      // Si es array, hacer múltiples búsquedas
      let allResults: SearchResult[] = []
      
      if (Array.isArray(query)) {
        // Buscar con las primeras 2 queries del array
        for (const q of query.slice(0, 2)) {
          const results = await executeSerperSearch(
            `${q} Colombia`, 
            Math.ceil((maxResults || 5) / 2),
            siteFilter
          )
          allResults.push(...results)
        }
      } else {
        allResults = await executeSerperSearch(
          `${normalizedQuery} Colombia`, 
          maxResults || 5,
          siteFilter
        )
      }
      
      // Filtrar solo fuentes oficiales y eliminar duplicados
      const officialResults = allResults
        .filter(r => r.type === 'official')
        .filter((r, i, arr) => arr.findIndex(x => x.url === r.url) === i)
      
      if (officialResults.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No se encontraron resultados oficiales para: "${normalizedQuery}". Intenta con otros términos o usa search_general_web.`,
          results: []
        })
      }
      
      console.log(`✅ [TOOL] search_legal_official: ${officialResults.length} resultados oficiales`)
      
      return JSON.stringify({
        success: true,
        query: normalizedQuery,
        totalResults: officialResults.length,
        results: officialResults.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          type: '🏛️ OFICIAL',
          score: r.score
        }))
      })
      
    } catch (error) {
      console.error(`❌ [TOOL] search_legal_official error:`, error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        results: []
      })
    }
  }
})

/**
 * Herramienta: Búsqueda en Fuentes Académicas
 */
export const searchLegalAcademicTool = new DynamicStructuredTool({
  name: "search_legal_academic",
  description: `Busca doctrina y análisis jurídico en fuentes académicas colombianas:
- Universidades (Externado, Nacional, Javeriana, Andes, etc.)
- Revistas de derecho
- Publicaciones especializadas
- Artículos académicos

Usa esta herramienta para complementar la información oficial con análisis doctrinario.`,
  schema: z.object({
    query: z.union([
      z.string(),
      z.array(z.string())
    ]).describe("Consulta de búsqueda académica. Puede ser un string o un array de strings."),
    maxResults: z.number().nullable().optional().default(3).describe("Número máximo de resultados (default: 3)")
  }),
  func: async ({ query, maxResults }) => {
    // Normalizar query
    const normalizedQuery = Array.isArray(query) ? query[0] : query
    
    console.log(`📚 [TOOL] search_legal_academic: "${normalizedQuery}"`)
    
    try {
      // Filtro para sitios académicos
      const siteFilter = 'site:edu.co OR site:redalyc.org OR site:scielo.org.co'
      
      const results = await executeSerperSearch(
        `${normalizedQuery} Colombia doctrina jurídica`, 
        maxResults || 3,
        siteFilter
      )
      
      if (results.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No se encontraron resultados académicos para: "${normalizedQuery}".`,
          results: []
        })
      }
      
      console.log(`✅ [TOOL] search_legal_academic: ${results.length} resultados académicos`)
      
      return JSON.stringify({
        success: true,
        query: normalizedQuery,
        totalResults: results.length,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          type: '📚 ACADÉMICO',
          score: r.score
        }))
      })
      
    } catch (error) {
      console.error(`❌ [TOOL] search_legal_academic error:`, error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        results: []
      })
    }
  }
})

/**
 * Herramienta: Búsqueda General en la Web
 */
export const searchGeneralWebTool = new DynamicStructuredTool({
  name: "search_general_web",
  description: `Búsqueda general en internet para información complementaria. 
Usa esta herramienta solo cuando las fuentes oficiales y académicas no proporcionen suficiente información.
Útil para información práctica, casos de uso, o contexto adicional.`,
  schema: z.object({
    query: z.union([
      z.string(),
      z.array(z.string())
    ]).describe("Consulta de búsqueda general. Puede ser un string o un array de strings."),
    maxResults: z.number().nullable().optional().default(5).describe("Número máximo de resultados (default: 5)")
  }),
  func: async ({ query, maxResults }) => {
    // Normalizar query
    const normalizedQuery = Array.isArray(query) ? query[0] : query
    
    console.log(`🌐 [TOOL] search_general_web: "${normalizedQuery}"`)
    
    try {
      const results = await executeSerperSearch(
        `${normalizedQuery} Colombia`, 
        maxResults || 5
      )
      
      if (results.length === 0) {
        return JSON.stringify({
          success: false,
          message: `No se encontraron resultados para: "${normalizedQuery}".`,
          results: []
        })
      }
      
      console.log(`✅ [TOOL] search_general_web: ${results.length} resultados`)
      
      return JSON.stringify({
        success: true,
        query: normalizedQuery,
        totalResults: results.length,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          type: r.type === 'official' ? '🏛️ OFICIAL' : r.type === 'academic' ? '📚 ACADÉMICO' : '🌐 GENERAL',
          score: r.score
        }))
      })
      
    } catch (error) {
      console.error(`❌ [TOOL] search_general_web error:`, error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        results: []
      })
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export const searchTools = [
  searchLegalOfficialTool,
  searchLegalAcademicTool,
  searchGeneralWebTool
]

export { executeSerperSearch, classifySourceType, scoreSource }

