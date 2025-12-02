/**
 * Herramienta de Búsqueda Directa de Artículos Legales
 * 
 * Esta herramienta busca y EXTRAE automáticamente el contenido completo
 * de artículos de leyes colombianas, devolviendo el texto literal.
 * 
 * Flujo:
 * 1. Busca en Google con Serper API
 * 2. Identifica las URLs más relevantes (oficiales primero)
 * 3. Extrae el contenido de las URLs
 * 4. Busca el artículo específico dentro del contenido
 * 5. Devuelve el texto literal del artículo
 */

import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const OFFICIAL_DOMAINS = [
  'secretariasenado.gov.co',
  'suin-juriscol.gov.co',
  'funcionpublica.gov.co',
  'corteconstitucional.gov.co',
  'consejodeestado.gov.co',
  'ramajudicial.gov.co',
  'minjusticia.gov.co'
]

// Mapeo de códigos/leyes a sus identificadores
const LAW_IDENTIFIERS: Record<string, string> = {
  'cgp': 'Ley 1564 de 2012 Código General del Proceso',
  'codigo general del proceso': 'Ley 1564 de 2012',
  'cpc': 'Decreto 1400 de 1970 Código de Procedimiento Civil',
  'codigo civil': 'Ley 84 de 1873 Código Civil',
  'cc': 'Ley 84 de 1873 Código Civil',
  'codigo penal': 'Ley 599 de 2000 Código Penal',
  'cp': 'Ley 599 de 2000 Código Penal',
  'cpp': 'Ley 906 de 2004 Código de Procedimiento Penal',
  'codigo de comercio': 'Decreto 410 de 1971 Código de Comercio',
  'cco': 'Decreto 410 de 1971 Código de Comercio',
  'cst': 'Decreto 2663 de 1950 Código Sustantivo del Trabajo',
  'codigo sustantivo del trabajo': 'Decreto 2663 de 1950',
  'constitucion': 'Constitución Política de Colombia 1991',
  'cn': 'Constitución Política de Colombia 1991',
  'constitucion politica': 'Constitución Política de Colombia 1991',
  'cpaca': 'Ley 1437 de 2011 CPACA',
  'codigo contencioso administrativo': 'Ley 1437 de 2011',
  'estatuto tributario': 'Decreto 624 de 1989 Estatuto Tributario',
  'et': 'Decreto 624 de 1989 Estatuto Tributario'
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resuelve el nombre completo de una ley a partir de abreviaturas
 */
function resolveLawName(input: string): string {
  const normalized = input.toLowerCase().trim()
  return LAW_IDENTIFIERS[normalized] || input
}

/**
 * Extrae el número de artículo de una query
 */
function extractArticleNumber(query: string): string | null {
  const patterns = [
    /art[íi]culo?\s*(\d+)/i,
    /art\.?\s*(\d+)/i,
    /(\d+)\s*(?:cgp|cpp|cp|cc|cco|cst|cpaca)/i
  ]
  
  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match) {
      return match[1]
    }
  }
  return null
}

/**
 * Busca con Serper API
 */
async function searchWithSerper(query: string, numResults: number = 8): Promise<any[]> {
  const apiKey = process.env.SERPER_API_KEY
  
  if (!apiKey) {
    throw new Error('SERPER_API_KEY no configurada')
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: query,
      num: numResults,
      gl: "co",
      hl: "es"
    }),
    signal: AbortSignal.timeout(15000)
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`)
  }

  const data = await response.json()
  return data.organic || []
}

/**
 * Extrae contenido de URL usando Jina Reader
 */
async function extractContent(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; AsistenteLegal/1.0)'
      },
      signal: AbortSignal.timeout(25000)
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}`)
    }

    const content = await response.text()
    return content
      .replace(/\n{3,}/g, '\n\n')
      .trim()

  } catch (error) {
    throw error
  }
}

/**
 * Extrae un artículo específico del contenido
 */
function extractArticleFromContent(content: string, articleNumber: string): string | null {
  // Patrones para encontrar artículos
  const patterns = [
    // Patrón estándar: ARTÍCULO 82. Texto...
    new RegExp(`(ART[ÍI]CULO\\s*${articleNumber}[°º]?\\.?[\\s\\S]*?)(?=ART[ÍI]CULO\\s*\\d+[°º]?\\.?|$)`, 'i'),
    // Variante: Art. 82 - Texto
    new RegExp(`(Art\\.?\\s*${articleNumber}[°º]?\\.?\\s*[-–]?[\\s\\S]*?)(?=Art\\.?\\s*\\d+[°º]?\\.?|$)`, 'i'),
    // Con nombre: Artículo 82. NOMBRE. Texto
    new RegExp(`(ART[ÍI]CULO\\s*${articleNumber}[°º]?\\.?[^\\n]*\\n[\\s\\S]*?)(?=ART[ÍI]CULO\\s*\\d+|$)`, 'i')
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      // Limpiar el contenido extraído
      let articleText = match[1]
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n')
      
      // Limitar longitud pero sin cortar a mitad de oración
      if (articleText.length > 3000) {
        const cutPoint = articleText.lastIndexOf('.', 3000)
        if (cutPoint > 2000) {
          articleText = articleText.substring(0, cutPoint + 1)
        }
      }
      
      return articleText
    }
  }

  return null
}

/**
 * Ordena URLs priorizando fuentes oficiales
 */
function prioritizeUrls(urls: any[]): any[] {
  return urls.sort((a, b) => {
    const aUrl = a.link?.toLowerCase() || ''
    const bUrl = b.link?.toLowerCase() || ''
    
    const aIsOfficial = OFFICIAL_DOMAINS.some(d => aUrl.includes(d))
    const bIsOfficial = OFFICIAL_DOMAINS.some(d => bUrl.includes(d))
    
    // Priorizar secretariasenado
    if (aUrl.includes('secretariasenado') && !bUrl.includes('secretariasenado')) return -1
    if (bUrl.includes('secretariasenado') && !aUrl.includes('secretariasenado')) return 1
    
    // Luego suin-juriscol
    if (aUrl.includes('suin-juriscol') && !bUrl.includes('suin-juriscol')) return -1
    if (bUrl.includes('suin-juriscol') && !aUrl.includes('suin-juriscol')) return 1
    
    // Después otras oficiales
    if (aIsOfficial && !bIsOfficial) return -1
    if (bIsOfficial && !aIsOfficial) return 1
    
    return 0
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export const searchArticleTool = new DynamicStructuredTool({
  name: "buscar_articulo_ley",
  description: `🔴 HERRAMIENTA CRÍTICA: Busca y devuelve el TEXTO LITERAL de artículos de leyes colombianas.

USA ESTA HERRAMIENTA cuando el usuario pregunte por:
- Un artículo específico de cualquier ley (art. 82 CGP, artículo 1502 código civil, etc.)
- El contenido de una norma específica
- Cualquier referencia a "artículo X" de cualquier código o ley

Esta herramienta:
1. Busca en Google fuentes oficiales
2. Extrae el contenido de la página
3. Encuentra el artículo específico
4. Devuelve el TEXTO LITERAL del artículo

IMPORTANTE: Siempre devuelve el texto exacto encontrado, NUNCA parafrasees ni inventes.`,

  schema: z.object({
    articulo: z.string().describe("Número del artículo a buscar. Ej: '82', '1502', '230'"),
    ley: z.string().describe("Nombre o código de la ley. Ej: 'CGP', 'Código Civil', 'Ley 1564 de 2012', 'Constitución'"),
    tema: z.string().optional().describe("Tema relacionado para refinar la búsqueda (opcional)")
  }),

  func: async ({ articulo, ley, tema }) => {
    console.log(`\n📜 [TOOL] buscar_articulo_ley: Artículo ${articulo} de ${ley}`)
    
    try {
      // Resolver nombre completo de la ley
      const lawName = resolveLawName(ley)
      
      // Construir queries de búsqueda
      const queries = [
        `artículo ${articulo} ${lawName} site:secretariasenado.gov.co`,
        `artículo ${articulo} ${lawName} site:suin-juriscol.gov.co`,
        `"artículo ${articulo}" ${lawName} Colombia texto completo`
      ]
      
      if (tema) {
        queries.push(`artículo ${articulo} ${lawName} ${tema}`)
      }

      // Buscar con la primera query
      console.log(`🔍 Buscando: ${queries[0]}`)
      let searchResults = await searchWithSerper(queries[0])
      
      // Si no hay resultados, intentar con segunda query
      if (searchResults.length === 0) {
        console.log(`🔍 Intentando: ${queries[1]}`)
        searchResults = await searchWithSerper(queries[1])
      }
      
      // Si aún no hay resultados, búsqueda general
      if (searchResults.length === 0) {
        console.log(`🔍 Búsqueda general: ${queries[2]}`)
        searchResults = await searchWithSerper(queries[2])
      }

      if (searchResults.length === 0) {
        return JSON.stringify({
          success: false,
          articulo,
          ley: lawName,
          error: "No se encontraron resultados en la búsqueda",
          sugerencia: "Intenta con el nombre completo de la ley (ej: 'Ley 1564 de 2012' en lugar de 'CGP')"
        })
      }

      // Priorizar URLs oficiales
      const prioritizedResults = prioritizeUrls(searchResults)
      console.log(`📋 ${prioritizedResults.length} resultados encontrados, intentando extraer contenido...`)

      // Intentar extraer de las primeras 3 URLs
      for (let i = 0; i < Math.min(3, prioritizedResults.length); i++) {
        const result = prioritizedResults[i]
        const url = result.link
        
        console.log(`📄 [${i + 1}/3] Extrayendo de: ${url.substring(0, 60)}...`)
        
        try {
          const content = await extractContent(url)
          
          if (content && content.length > 500) {
            // Buscar el artículo específico
            const articleText = extractArticleFromContent(content, articulo)
            
            if (articleText && articleText.length > 50) {
              console.log(`✅ Artículo ${articulo} encontrado! (${articleText.length} caracteres)`)
              
              return JSON.stringify({
                success: true,
                articulo,
                ley: lawName,
                fuente: {
                  url,
                  titulo: result.title,
                  tipo: OFFICIAL_DOMAINS.some(d => url.includes(d)) ? 'OFICIAL' : 'GENERAL'
                },
                texto_articulo: articleText,
                nota: "Este es el texto literal extraído de la fuente oficial."
              })
            }
            
            // Si no encontró el artículo específico pero tiene contenido relevante
            // Devolver un fragmento del contenido que mencione el artículo
            const lowerContent = content.toLowerCase()
            const articleMention = lowerContent.indexOf(`artículo ${articulo}`.toLowerCase())
            
            if (articleMention !== -1) {
              const start = Math.max(0, articleMention - 100)
              const end = Math.min(content.length, articleMention + 2000)
              const fragment = content.substring(start, end).trim()
              
              console.log(`⚠️ Artículo mencionado pero no extraído completamente`)
              
              return JSON.stringify({
                success: true,
                articulo,
                ley: lawName,
                fuente: {
                  url,
                  titulo: result.title,
                  tipo: OFFICIAL_DOMAINS.some(d => url.includes(d)) ? 'OFICIAL' : 'GENERAL'
                },
                texto_articulo: fragment,
                nota: "Fragmento que contiene el artículo. El texto puede no estar completo."
              })
            }
          }
        } catch (extractError) {
          console.log(`⚠️ Error extrayendo de ${url.substring(0, 40)}: ${extractError}`)
          continue
        }
      }

      // Si llegamos aquí, no pudimos extraer el artículo pero tenemos URLs
      const sourcesInfo = prioritizedResults.slice(0, 5).map(r => ({
        titulo: r.title,
        url: r.link,
        snippet: r.snippet
      }))

      return JSON.stringify({
        success: false,
        articulo,
        ley: lawName,
        error: "Se encontraron fuentes pero no se pudo extraer el texto del artículo",
        fuentes_encontradas: sourcesInfo,
        sugerencia: `Visita directamente: ${prioritizedResults[0]?.link || 'secretariasenado.gov.co'}`
      })

    } catch (error) {
      console.error(`❌ [TOOL] buscar_articulo_ley error:`, error)
      return JSON.stringify({
        success: false,
        articulo,
        ley,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTA DE BÚSQUEDA DIRECTA EN GOOGLE
// ═══════════════════════════════════════════════════════════════════════════════

export const googleSearchDirectTool = new DynamicStructuredTool({
  name: "google_search_directo",
  description: `Realiza una búsqueda directa en Google y EXTRAE automáticamente el contenido de la primera fuente oficial encontrada.

Usa esta herramienta para:
- Buscar cualquier información legal que no encontraste con otras herramientas
- Obtener el contenido real de una página web
- Verificar información específica

La herramienta devuelve tanto los resultados de búsqueda como el contenido extraído de la mejor fuente.`,

  schema: z.object({
    query: z.string().describe("Consulta de búsqueda exacta"),
    extractContent: z.boolean().optional().default(true).describe("Si debe extraer automáticamente el contenido de la primera fuente oficial")
  }),

  func: async ({ query, extractContent: shouldExtract }) => {
    console.log(`\n🔎 [TOOL] google_search_directo: "${query}"`)
    
    try {
      // Buscar
      const searchResults = await searchWithSerper(query, 10)
      
      if (searchResults.length === 0) {
        return JSON.stringify({
          success: false,
          query,
          error: "No se encontraron resultados"
        })
      }

      const prioritized = prioritizeUrls(searchResults)
      
      // Si no debe extraer, solo devolver resultados
      if (!shouldExtract) {
        return JSON.stringify({
          success: true,
          query,
          resultados: prioritized.slice(0, 5).map(r => ({
            titulo: r.title,
            url: r.link,
            snippet: r.snippet,
            esOficial: OFFICIAL_DOMAINS.some(d => r.link?.includes(d))
          }))
        })
      }

      // Intentar extraer contenido de la primera fuente oficial
      for (const result of prioritized.slice(0, 3)) {
        const url = result.link
        
        try {
          console.log(`📄 Extrayendo contenido de: ${url.substring(0, 60)}...`)
          const content = await extractContent(url)
          
          if (content && content.length > 500) {
            // Truncar si es muy largo
            const truncatedContent = content.length > 8000 
              ? content.substring(0, 8000) + "\n\n[... contenido truncado por longitud ...]"
              : content
            
            console.log(`✅ Contenido extraído: ${truncatedContent.length} caracteres`)
            
            return JSON.stringify({
              success: true,
              query,
              fuente: {
                url,
                titulo: result.title,
                esOficial: OFFICIAL_DOMAINS.some(d => url.includes(d))
              },
              contenido: truncatedContent,
              otrosResultados: prioritized.slice(1, 4).map(r => ({
                titulo: r.title,
                url: r.link
              }))
            })
          }
        } catch (e) {
          console.log(`⚠️ Error extrayendo de ${url.substring(0, 40)}`)
          continue
        }
      }

      // Si no pudo extraer, devolver solo los resultados
      return JSON.stringify({
        success: true,
        query,
        nota: "No se pudo extraer contenido automáticamente de las fuentes",
        resultados: prioritized.slice(0, 5).map(r => ({
          titulo: r.title,
          url: r.link,
          snippet: r.snippet,
          esOficial: OFFICIAL_DOMAINS.some(d => r.link?.includes(d))
        }))
      })

    } catch (error) {
      console.error(`❌ [TOOL] google_search_directo error:`, error)
      return JSON.stringify({
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export const articleSearchTools = [
  searchArticleTool,
  googleSearchDirectTool
]












