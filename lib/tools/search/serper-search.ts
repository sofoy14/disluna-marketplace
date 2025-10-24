/**
 * Herramienta Serper para búsqueda web - Compatible con OpenAI Tool Calling
 * Implementa el esquema JSON requerido para tool calling
 */

export interface SerperSearchResult {
  title: string
  link: string
  snippet: string
}

export interface SerperResponse {
  results: SerperSearchResult[]
  searchParameters: {
    q: string
    num: number
    gl: string
    hl: string
  }
}

/**
 * Ejecuta búsqueda web usando Serper.dev API
 */
async function executeSerperSearch({
  q,
  num = 10,
  gl = "co",
  hl = "es"
}: {
  q: string
  num?: number
  gl?: string
  hl?: string
}): Promise<SerperResponse> {
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    throw new Error("SERPER_API_KEY no configurada en variables de entorno")
  }

  console.log(`🔍 Serper Search: "${q}" (${num} resultados)`)

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q,
        num,
        gl,
        hl
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log(`✅ Serper: ${data.organic?.length || 0} resultados encontrados`)

    return {
      results: data.organic?.map((item: any) => ({
        title: item.title || "Sin título",
        link: item.link || "",
        snippet: item.snippet || "Sin descripción"
      })) || [],
      searchParameters: { q, num, gl, hl }
    }

  } catch (error) {
    console.error(`❌ Error en Serper Search:`, error)
    throw new Error(`Error en búsqueda Serper: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

/**
 * Función principal para serperSearch - Compatible con OpenAI Tool Calling
 */
export async function serperSearchFunction({
  q,
  num = 10,
  gl = "co",
  hl = "es"
}: {
  q: string
  num?: number
  gl?: string
  hl?: string
}): Promise<string> {
  try {
    const result = await executeSerperSearch({ q, num, gl, hl })
    
    // Formatear resultado para el agente
    const formattedResults = result.results.map((item, index) => 
      `${index + 1}. **${item.title}**\n   ${item.snippet}\n   🔗 ${item.link}`
    ).join('\n\n')

    return `🔍 **Búsqueda Serper completada**\n\nQuery: "${q}"\nResultados encontrados: ${result.results.length}\n\n${formattedResults}`
    
  } catch (error) {
    return `❌ Error en búsqueda Serper: ${error instanceof Error ? error.message : 'Error desconocido'}`
  }
}

/**
 * Función de utilidad para búsquedas directas
 */
export async function searchWithSerper(
  query: string, 
  numResults: number = 10
): Promise<SerperSearchResult[]> {
  const result = await executeSerperSearch({ q: query, num: numResults })
  return result.results
}

/**
 * Verifica disponibilidad de Serper API
 */
export async function checkSerperAvailability(): Promise<boolean> {
  const apiKey = process.env.SERPER_API_KEY
  return Boolean(apiKey)
}