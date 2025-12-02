/**
 * Prompts y utilidades para el agente legal
 * Normalización de consultas legales para búsqueda optimizada
 */

/**
 * Patrones de normalización legal para diferentes tipos de consultas
 */
const LEGAL_PATTERNS = [
  // Artículos constitucionales
  {
    pattern: /art(?:iculo|ículo|\.?)?\s*(\d+[a-z]?)\s*(?:de la\s*)?constitu/i,
    normalize: (match: RegExpMatchArray) => 
      `"articulo ${match[1]}" "Constitucion Politica de Colombia 1991" site:secretariasenado.gov.co OR site:corteconstitucional.gov.co`
  },
  // Códigos legales
  {
    pattern: /art(?:iculo|ículo|\.?)?\s*(\d+[a-z]?)\s*(?:del?\s*)?(?:codigo|código)\s*(civil|penal|comercio|laboral|procedimiento)/i,
    normalize: (match: RegExpMatchArray) => 
      `"articulo ${match[1]}" "codigo ${match[2]}" Colombia site:secretariasenado.gov.co`
  },
  // Sentencias de la Corte Constitucional
  {
    pattern: /sentencia\s*([ctsu])-?(\d+)\s*(?:de|del)?\s*(\d{4})?/i,
    normalize: (match: RegExpMatchArray) => {
      const tipo = match[1].toUpperCase()
      const numero = match[2]
      const year = match[3] || ''
      return `sentencia ${tipo}-${numero}${year ? ' ' + year : ''} site:corteconstitucional.gov.co`
    }
  },
  // Leyes
  {
    pattern: /ley\s*(\d+)\s*(?:de|del)?\s*(\d{4})?/i,
    normalize: (match: RegExpMatchArray) => 
      `"ley ${match[1]}"${match[2] ? ' "' + match[2] + '"' : ''} Colombia site:secretariasenado.gov.co OR site:suin-juriscol.gov.co`
  },
  // Decretos
  {
    pattern: /decreto\s*(\d+)\s*(?:de|del)?\s*(\d{4})?/i,
    normalize: (match: RegExpMatchArray) =>
      `"decreto ${match[1]}"${match[2] ? ' "' + match[2] + '"' : ''} Colombia site:funcionpublica.gov.co OR site:suin-juriscol.gov.co`
  },
  // Resoluciones
  {
    pattern: /resolucion\s*(\d+)\s*(?:de|del)?\s*(\d{4})?/i,
    normalize: (match: RegExpMatchArray) =>
      `"resolucion ${match[1]}"${match[2] ? ' "' + match[2] + '"' : ''} Colombia normativa`
  }
]

/**
 * Normaliza una consulta legal para optimizar la búsqueda
 * Detecta patrones comunes (artículos, sentencias, leyes) y los formatea
 * para obtener mejores resultados en buscadores
 * 
 * @param query La consulta original del usuario
 * @returns La consulta normalizada o la original si no se detecta patrón
 */
export function normalizeLegalQuery(query: string): string {
  const queryLower = query.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos para matching
  
  for (const { pattern, normalize } of LEGAL_PATTERNS) {
    const match = queryLower.match(pattern)
    if (match) {
      console.log(`[normalizeLegalQuery] Patrón detectado: ${pattern.toString()}`)
      return normalize(match)
    }
  }
  
  // Si no hay patrón específico, agregar contexto legal colombiano
  if (queryLower.includes('colombia') || 
      queryLower.includes('colombian') ||
      queryLower.includes('derecho')) {
    return `${query} normativa Colombia`
  }
  
  // Retornar query original si no se detecta patrón legal
  return query
}

/**
 * System prompt para el agente legal
 */
export const LEGAL_AGENT_SYSTEM_PROMPT = `Eres un asistente legal especializado en derecho colombiano.

Tu rol es:
1. Proporcionar información precisa sobre leyes, decretos, sentencias y normativa colombiana
2. Citar fuentes oficiales cuando sea posible
3. Aclarar cuando una consulta requiere asesoría profesional
4. Mantener respuestas estructuradas y claras

Fuentes principales:
- Constitución Política de Colombia 1991
- Códigos (Civil, Penal, Comercio, Laboral, Procedimiento)
- Leyes del Congreso de Colombia
- Decretos del Gobierno Nacional
- Jurisprudencia de las Altas Cortes

IMPORTANTE: Siempre indica que tus respuestas son informativas y no constituyen asesoría legal profesional.`

