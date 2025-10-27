/**
 * Sistema de Búsqueda Simplificado para Tongyi
 * Versión que funciona directamente con las APIs sin dependencias complejas
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
}

export class SimpleSearchEngine {
  private serperApiKey: string

  constructor() {
    this.serperApiKey = process.env.SERPER_API_KEY || ""
  }

  async searchOfficial(query: string, maxResults: number = 3): Promise<SearchResult[]> {
    console.log(`🔍 Searching official sources for: "${query}"`)
    
    if (!this.serperApiKey) {
      console.error("❌ SERPER_API_KEY not configured")
      return []
    }

    try {
      const searchQuery = `${query} Colombia site:corteconstitucional.gov.co OR site:cortesuprema.gov.co OR site:minjusticia.gov.co`
      
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          num: maxResults
        })
      })

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`)
      }

      const data = await response.json()
      const results: SearchResult[] = []

      if (data.organic) {
        for (const item of data.organic.slice(0, maxResults)) {
          results.push({
            title: item.title || 'Sin título',
            url: item.link || '',
            snippet: item.snippet || 'Sin descripción'
          })
        }
      }

      console.log(`✅ Found ${results.length} official sources`)
      return results

    } catch (error) {
      console.error('Error in official search:', error)
      return []
    }
  }

  async searchAcademic(query: string, maxResults: number = 3): Promise<SearchResult[]> {
    console.log(`🔍 Searching academic sources for: "${query}"`)
    
    if (!this.serperApiKey) {
      console.error("❌ SERPER_API_KEY not configured")
      return []
    }

    try {
      const searchQuery = `${query} Colombia derecho "artículo" OR "ley" OR "decreto"`
      
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          num: maxResults
        })
      })

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`)
      }

      const data = await response.json()
      const results: SearchResult[] = []

      if (data.organic) {
        for (const item of data.organic.slice(0, maxResults)) {
          results.push({
            title: item.title || 'Sin título',
            url: item.link || '',
            snippet: item.snippet || 'Sin descripción'
          })
        }
      }

      console.log(`✅ Found ${results.length} academic sources`)
      return results

    } catch (error) {
      console.error('Error in academic search:', error)
      return []
    }
  }

  async searchGeneral(query: string, maxResults: number = 2): Promise<SearchResult[]> {
    console.log(`🔍 Searching general sources for: "${query}"`)
    
    if (!this.serperApiKey) {
      console.error("❌ SERPER_API_KEY not configured")
      return []
    }

    try {
      const searchQuery = `${query} Colombia`
      
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          num: maxResults
        })
      })

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`)
      }

      const data = await response.json()
      const results: SearchResult[] = []

      if (data.organic) {
        for (const item of data.organic.slice(0, maxResults)) {
          results.push({
            title: item.title || 'Sin título',
            url: item.link || '',
            snippet: item.snippet || 'Sin descripción'
          })
        }
      }

      console.log(`✅ Found ${results.length} general sources`)
      return results

    } catch (error) {
      console.error('Error in general search:', error)
      return []
    }
  }
}











