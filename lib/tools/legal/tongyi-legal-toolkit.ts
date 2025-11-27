/**
 * Toolkit Unificado de Herramientas Legales para Tongyi
 * Versión CORREGIDA - Tools funcionales con Serper API
 */

import { extractUrlContent } from "@/lib/tools/web-search"

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Tool {
  name: string
  description: string
  implementation: (...args: any[]) => Promise<any>
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
  type: 'official' | 'academic' | 'general'
  score: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// BÚSQUEDA CON SERPER API
// ═══════════════════════════════════════════════════════════════════════════════

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
    case 'official': return 3
    case 'academic': return 2
    default: return 1
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTACIONES DE TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Busca en fuentes legales oficiales colombianas
 */
const searchOfficialSources = async (args: { query: string; maxResults?: number }): Promise<SearchResult[]> => {
  console.log(`🔍 [TOOL] searchOfficialSources: "${args.query}"`)
  
  try {
    // Filtro para sitios oficiales colombianos
    const siteFilter = 'site:gov.co OR site:corteconstitucional.gov.co OR site:consejodeestado.gov.co OR site:suin-juriscol.gov.co OR site:secretariasenado.gov.co'
    
    const results = await executeSerperSearch(
      `${args.query} Colombia`, 
      args.maxResults || 5,
      siteFilter
    )
    
    // Filtrar solo fuentes oficiales y enriquecer contenido
    const officialResults = results.filter(r => r.type === 'official')
    
    // Enriquecer top 3 con contenido completo usando Jina AI
    const enrichedResults = await Promise.all(
      officialResults.slice(0, 3).map(async (result) => {
        try {
          const content = await extractUrlContent(result.url)
          return { 
            ...result, 
            content: content && !content.startsWith('Error') ? content.slice(0, 2000) : result.snippet 
          }
        } catch (error) {
          console.warn(`⚠️ Error extrayendo contenido de ${result.url}`)
          return { ...result, content: result.snippet }
        }
      })
    )
    
    console.log(`✅ [TOOL] searchOfficialSources: ${enrichedResults.length} resultados oficiales`)
    return enrichedResults
    
  } catch (error) {
    console.error(`❌ [TOOL] searchOfficialSources error:`, error)
    return []
  }
}

/**
 * Busca en fuentes académicas
 */
const searchAcademicSources = async (args: { query: string; maxResults?: number }): Promise<SearchResult[]> => {
  console.log(`🔍 [TOOL] searchAcademicSources: "${args.query}"`)
  
  try {
    // Filtro para sitios académicos
    const siteFilter = 'site:edu.co OR site:redalyc.org OR site:scielo.org.co'
    
    const results = await executeSerperSearch(
      `${args.query} Colombia doctrina jurídica`, 
      args.maxResults || 3,
      siteFilter
    )
    
    // Enriquecer top 2 con contenido completo
    const enrichedResults = await Promise.all(
      results.slice(0, 2).map(async (result) => {
        try {
          const content = await extractUrlContent(result.url)
          return { 
            ...result, 
            content: content && !content.startsWith('Error') ? content.slice(0, 2000) : result.snippet 
          }
        } catch (error) {
          return { ...result, content: result.snippet }
        }
      })
    )
    
    console.log(`✅ [TOOL] searchAcademicSources: ${enrichedResults.length} resultados académicos`)
    return enrichedResults
    
  } catch (error) {
    console.error(`❌ [TOOL] searchAcademicSources error:`, error)
    return []
  }
}

/**
 * Búsqueda general en la web
 */
const searchGeneralWeb = async (args: { query: string; maxResults?: number }): Promise<SearchResult[]> => {
  console.log(`🔍 [TOOL] searchGeneralWeb: "${args.query}"`)
  
  try {
    const results = await executeSerperSearch(
      `${args.query} Colombia`, 
      args.maxResults || 5
    )
    
    // Enriquecer top 2 con contenido
    const enrichedResults = await Promise.all(
      results.slice(0, 2).map(async (result) => {
        try {
          const content = await extractUrlContent(result.url)
          return { 
            ...result, 
            content: content && !content.startsWith('Error') ? content.slice(0, 1500) : result.snippet 
          }
        } catch (error) {
          return { ...result, content: result.snippet }
        }
      })
    )
    
    console.log(`✅ [TOOL] searchGeneralWeb: ${enrichedResults.length} resultados generales`)
    return enrichedResults
    
  } catch (error) {
    console.error(`❌ [TOOL] searchGeneralWeb error:`, error)
    return []
  }
}

/**
 * Extrae contenido completo de una URL usando Jina AI
 */
const extractWithJina = async (args: { url: string }): Promise<{ content: string; url: string }> => {
  console.log(`🔍 [TOOL] extractWithJina: "${args.url}"`)
  
  try {
    const content = await extractUrlContent(args.url)
    return { 
      content: content || 'Contenido no disponible', 
      url: args.url 
    }
  } catch (error) {
    console.error(`❌ [TOOL] extractWithJina error:`, error)
    return { 
      content: 'Error extrayendo contenido', 
      url: args.url 
    }
  }
}

/**
 * Verifica fuentes legales (placeholder - se puede expandir)
 */
const verifyLegalSources = async (args: { sources: any[] }): Promise<{ verified: boolean; issues: string[] }> => {
  console.log(`🔍 [TOOL] verifyLegalSources: ${args.sources?.length || 0} fuentes`)
  
  // Verificación básica - comprobar que las URLs son accesibles
  const issues: string[] = []
  
  for (const source of (args.sources || [])) {
    if (!source.url) {
      issues.push(`Fuente sin URL: ${source.title}`)
    } else if (!source.url.includes('.gov.co') && !source.url.includes('.edu.co')) {
      issues.push(`Fuente no oficial: ${source.url}`)
    }
  }
  
  return {
    verified: issues.length === 0,
    issues
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINICIÓN DE TOOLS PARA OPENAI/OPENROUTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Definiciones de tools en formato OpenAI para tool calling
 */
export const LEGAL_TOOLS_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "search_legal_official",
      description: "OBLIGATORIO para consultas legales. Busca información en fuentes oficiales colombianas: Corte Constitucional, Consejo de Estado, SUIN-Juriscol, Secretaría del Senado, ministerios, superintendencias, etc. Usa esta herramienta PRIMERO para cualquier pregunta sobre leyes, decretos, sentencias, jurisprudencia o normatividad colombiana.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Consulta de búsqueda legal. Incluye términos específicos como nombres de leyes, artículos, o temas legales. Ejemplo: 'prescripción adquisitiva código civil' o 'tutela derechos fundamentales'"
          },
          maxResults: {
            type: "number",
            description: "Número máximo de resultados (default: 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_legal_academic",
      description: "Busca doctrina y análisis jurídico en fuentes académicas colombianas: universidades, revistas de derecho, publicaciones especializadas. Usa esta herramienta para complementar la información oficial con análisis doctrinario.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Consulta de búsqueda académica. Incluye términos jurídicos y el tema a investigar."
          },
          maxResults: {
            type: "number",
            description: "Número máximo de resultados (default: 3)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_general_web",
      description: "Búsqueda general en internet para información complementaria. Usa esta herramienta solo cuando las fuentes oficiales y académicas no proporcionen suficiente información.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Consulta de búsqueda general"
          },
          maxResults: {
            type: "number",
            description: "Número máximo de resultados (default: 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "web_content_extract",
      description: "Extrae el contenido completo de una URL específica. Usa esta herramienta cuando necesites leer el texto completo de una página web encontrada en búsquedas anteriores.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL completa de la página a extraer"
          }
        },
        required: ["url"]
      }
    }
  }
]

/**
 * Mapa de implementaciones para ejecutar tools
 */
export const TOOL_IMPLEMENTATIONS: Record<string, (...args: any[]) => Promise<any>> = {
  'search_legal_official': searchOfficialSources,
  'search_legal_academic': searchAcademicSources,
  'search_general_web': searchGeneralWeb,
  'web_content_extract': extractWithJina,
  'legal_source_verify': verifyLegalSources
}

/**
 * Ejecuta una tool por nombre
 */
export async function executeTool(toolName: string, args: any): Promise<any> {
  const implementation = TOOL_IMPLEMENTATIONS[toolName]
  
  if (!implementation) {
    console.error(`❌ Tool no encontrada: ${toolName}`)
    throw new Error(`Tool '${toolName}' no encontrada`)
  }
  
  console.log(`🔧 Ejecutando tool: ${toolName}`, args)
  return implementation(args)
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN LEGACY (compatibilidad con código existente)
// ═══════════════════════════════════════════════════════════════════════════════

export const LEGAL_TOOLS: Tool[] = [
  {
    name: 'search_legal_official',
    description: 'Busca información legal en fuentes oficiales colombianas (leyes, decretos, sentencias de altas cortes).',
    implementation: searchOfficialSources
  },
  {
    name: 'search_legal_academic',
    description: 'Busca información legal en fuentes académicas (artículos, revistas, libros de derecho).',
    implementation: searchAcademicSources
  },
  {
    name: 'search_general_web',
    description: 'Realiza una búsqueda general en la web para información complementaria.',
    implementation: searchGeneralWeb
  },
  {
    name: 'web_content_extract',
    description: 'Extrae el contenido completo de una URL utilizando Jina AI.',
    implementation: extractWithJina
  },
  {
    name: 'legal_source_verify',
    description: 'Verifica la autenticidad y relevancia de las fuentes legales.',
    implementation: verifyLegalSources
  }
]
