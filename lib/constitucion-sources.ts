/**
 * Fuentes y utilidades para artículos constitucionales
 * Proporciona acceso a la Constitución Política de Colombia 1991
 */

export interface ConstitutionArticle {
  number: string
  title?: string
  content: string
  source: string
}

/**
 * Detecta si una consulta se refiere a un artículo constitucional
 * @param query La consulta del usuario
 * @returns El número del artículo si es constitucional, null si no
 */
export function isConstitutionalArticle(query: string): string | null {
  const queryLower = query.toLowerCase()
  
  // Verificar si menciona constitución o constitucional
  const isConstitutional = 
    queryLower.includes('constitucion') || 
    queryLower.includes('constitución') ||
    queryLower.includes('constitucional') ||
    queryLower.includes('c.p.') ||
    queryLower.includes('carta magna')
  
  if (!isConstitutional) return null
  
  // Extraer número de artículo
  const patterns = [
    /art(?:iculo|ículo|\.?)?\s*(\d+[a-z]?)/i,
    /(\d+)\s*(?:de la|constituci)/i
  ]
  
  for (const pattern of patterns) {
    const match = queryLower.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

/**
 * Obtiene el contenido de un artículo constitucional
 * @param articleNumber Número del artículo
 * @returns El artículo con su contenido o null si no se encuentra
 */
export async function getConstitutionArticle(articleNumber: string): Promise<ConstitutionArticle | null> {
  // URL oficial del Senado de Colombia
  const baseUrl = 'https://www.secretariasenado.gov.co/constitucion-politica'
  
  try {
    // Por ahora retornamos información básica
    // En producción, esto podría conectarse a una API o base de datos
    return {
      number: articleNumber,
      content: `Artículo ${articleNumber} de la Constitución Política de Colombia de 1991. ` +
               `Para el contenido completo, consulte: ${baseUrl}`,
      source: baseUrl
    }
  } catch (error) {
    console.error(`[constitucion-sources] Error obteniendo artículo ${articleNumber}:`, error)
    return null
  }
}

/**
 * URLs oficiales para consultar la Constitución
 */
export const CONSTITUTION_SOURCES = [
  'https://www.secretariasenado.gov.co/constitucion-politica',
  'https://www.corteconstitucional.gov.co/inicio/Constitucion%20politica%20de%20Colombia.pdf',
  'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=4125'
]

