/**
 * Herramientas de Extracción de Contenido
 * 
 * Implementa herramientas para extraer y procesar contenido web:
 * - Extracción de texto de URLs usando Jina AI Reader
 * - Procesamiento de documentos legales
 */

import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE EXTRACCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrae contenido de una URL usando Jina AI Reader
 */
async function extractWithJina(url: string, maxLength: number = 5000): Promise<string> {
  try {
    console.log(`📄 Extrayendo contenido de: ${url.substring(0, 60)}...`)
    
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; AsistenteLegal/1.0)'
      },
      signal: AbortSignal.timeout(20000)
    })

    if (!response.ok) {
      console.log(`⚠️ Jina error ${response.status} para ${url.substring(0, 40)}`)
      throw new Error(`Error ${response.status} al extraer contenido`)
    }

    const content = await response.text()
    
    // Limpiar y truncar contenido
    const cleanContent = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, maxLength)

    console.log(`✅ Extraído: ${cleanContent.length} caracteres`)
    return cleanContent

  } catch (error) {
    console.log(`⚠️ Error extrayendo ${url.substring(0, 40)}: ${error}`)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTAS DE LANGCHAIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Herramienta: Extraer Contenido Web
 */
export const extractWebContentTool = new DynamicStructuredTool({
  name: "extract_web_content",
  description: `Extrae el contenido completo de una URL específica.
Usa esta herramienta cuando necesites:
- Leer el texto completo de una página web encontrada en búsquedas anteriores
- Obtener más detalle de un documento legal
- Verificar información de una fuente específica

La herramienta devuelve el texto limpio de la página (hasta 5000 caracteres).`,
  schema: z.object({
    url: z.string().url().describe("URL completa de la página a extraer. Debe ser una URL válida."),
    maxLength: z.number().nullable().optional().default(5000).describe("Longitud máxima del contenido a extraer (default: 5000)")
  }),
  func: async ({ url, maxLength }) => {
    console.log(`📄 [TOOL] extract_web_content: "${url}"`)
    
    try {
      const content = await extractWithJina(url, maxLength || 5000)
      
      if (!content || content.length < 100) {
        return JSON.stringify({
          success: false,
          url,
          message: "No se pudo extraer contenido significativo de la URL",
          content: ""
        })
      }
      
      console.log(`✅ [TOOL] extract_web_content: ${content.length} caracteres extraídos`)
      
      return JSON.stringify({
        success: true,
        url,
        contentLength: content.length,
        content
      })
      
    } catch (error) {
      console.error(`❌ [TOOL] extract_web_content error:`, error)
      return JSON.stringify({
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Error desconocido',
        content: ""
      })
    }
  }
})

/**
 * Herramienta: Verificar Accesibilidad de Fuentes
 */
export const verifySourcesTool = new DynamicStructuredTool({
  name: "verify_sources",
  description: `Verifica que las fuentes citadas sean accesibles y válidas.
Usa esta herramienta para verificar que las URLs mencionadas en tu respuesta 
realmente existen y son accesibles antes de incluirlas en la respuesta final.`,
  schema: z.object({
    urls: z.array(z.string().url()).describe("Lista de URLs a verificar")
  }),
  func: async ({ urls }) => {
    console.log(`🔍 [TOOL] verify_sources: ${urls.length} URLs`)
    
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          })
          return {
            url,
            accessible: response.ok,
            status: response.status
          }
        } catch {
          return {
            url,
            accessible: false,
            status: 0,
            error: 'No se pudo acceder'
          }
        }
      })
    )
    
    const accessible = results.filter(r => r.accessible).length
    
    console.log(`✅ [TOOL] verify_sources: ${accessible}/${urls.length} URLs accesibles`)
    
    return JSON.stringify({
      success: true,
      totalUrls: urls.length,
      accessibleUrls: accessible,
      results
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES
// ═══════════════════════════════════════════════════════════════════════════════

export const contentTools = [
  extractWebContentTool,
  verifySourcesTool
]

export { extractWithJina }

