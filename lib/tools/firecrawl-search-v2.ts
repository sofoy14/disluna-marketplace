import axios from 'axios'

export interface FireCrawlSearchResult {
  success: boolean
  data?: {
    success: boolean
    data: Array<{
      title: string
      url: string
      description: string
      publishedTime?: string
      author?: string
      score: number
      content?: string
    }>
    meta: {
      totalResults: number
      page: number
      limit: number
    }
  }
  error?: string
}

export interface FireCrawlSearchOptions {
  query: string
  limit?: number
  page?: number
  country?: string
  language?: string
  searchEngine?: 'google' | 'bing' | 'duckduckgo'
  includeContent?: boolean
  maxContentLength?: number
}

/**
 * Cliente para FireCrawl Search v2
 * Implementa búsquedas web avanzadas con extracción de contenido
 */
export class FireCrawlSearchClient {
  private apiKey: string
  private baseUrl: string = 'https://api.firecrawl.dev/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️ FireCrawl API Key no configurada. Define FIRECRAWL_API_KEY.')
    }
  }

  /**
   * Realiza una búsqueda web usando FireCrawl Search v2
   */
  async search(options: FireCrawlSearchOptions): Promise<FireCrawlSearchResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'FireCrawl API Key no configurada'
      }
    }

    try {
      console.log(`🔥 FireCrawl Search v2: "${options.query}"`)
      
      const searchParams = {
        query: options.query,
        limit: options.limit || 10,
        page: options.page || 1,
        country: options.country || 'CO', // Colombia por defecto
        language: options.language || 'es',
        searchEngine: options.searchEngine || 'google',
        includeContent: options.includeContent || true,
        maxContentLength: options.maxContentLength || 4000
      }

      const response = await axios.post(
        `${this.baseUrl}/search`,
        searchParams,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos timeout
        }
      )

      console.log(`✅ FireCrawl Search v2: ${response.data?.data?.length || 0} resultados encontrados`)

      return {
        success: true,
        data: response.data
      }

    } catch (error: any) {
      console.error('❌ Error en FireCrawl Search v2:', error.message)
      
      return {
        success: false,
        error: error.message || 'Error desconocido en FireCrawl Search'
      }
    }
  }

  /**
   * Realiza búsqueda especializada para contenido legal colombiano
   */
  async searchLegalContent(query: string, limit: number = 8): Promise<FireCrawlSearchResult> {
    console.log(`🏛️ FireCrawl Legal Search: "${query}"`)
    
    // Optimizar query para búsquedas legales
    const legalQuery = this.optimizeLegalQuery(query)
    
    return await this.search({
      query: legalQuery,
      limit,
      country: 'CO',
      language: 'es',
      searchEngine: 'google',
      includeContent: true,
      maxContentLength: 5000
    })
  }

  /**
   * Realiza búsqueda en fuentes oficiales colombianas
   */
  async searchOfficialSources(query: string, limit: number = 6): Promise<FireCrawlSearchResult> {
    console.log(`🏛️ FireCrawl Official Search: "${query}"`)
    
    // Agregar términos para fuentes oficiales
    const officialQuery = `${query} site:gov.co OR site:minjusticia.gov.co OR site:corteconstitucional.gov.co OR site:superintendencias.gov.co OR site:congreso.gov.co`
    
    return await this.search({
      query: officialQuery,
      limit,
      country: 'CO',
      language: 'es',
      searchEngine: 'google',
      includeContent: true,
      maxContentLength: 6000
    })
  }

  /**
   * Realiza búsqueda en fuentes académicas y jurisprudenciales
   */
  async searchAcademicSources(query: string, limit: number = 5): Promise<FireCrawlSearchResult> {
    console.log(`🎓 FireCrawl Academic Search: "${query}"`)
    
    // Agregar términos para fuentes académicas
    const academicQuery = `${query} site:universidad.edu.co OR site:academia.edu OR site:researchgate.net OR "jurisprudencia" OR "doctrina" OR "tesis"`
    
    return await this.search({
      query: academicQuery,
      limit,
      country: 'CO',
      language: 'es',
      searchEngine: 'google',
      includeContent: true,
      maxContentLength: 4000
    })
  }

  /**
   * Optimiza la query para búsquedas legales
   */
  private optimizeLegalQuery(query: string): string {
    const legalTerms = [
      'derecho', 'legal', 'jurídico', 'norma', 'ley', 'código',
      'constitución', 'artículo', 'decreto', 'resolución',
      'jurisprudencia', 'doctrina', 'sentencia', 'fallo'
    ]
    
    const queryLower = query.toLowerCase()
    const hasLegalTerm = legalTerms.some(term => queryLower.includes(term))
    
    if (!hasLegalTerm) {
      return `${query} derecho colombiano`
    }
    
    return query
  }

  /**
   * Combina múltiples búsquedas para obtener resultados completos
   */
  async searchComprehensive(query: string): Promise<{
    official: FireCrawlSearchResult
    academic: FireCrawlSearchResult
    general: FireCrawlSearchResult
  }> {
    console.log(`🔍 FireCrawl Comprehensive Search: "${query}"`)
    
    const [official, academic, general] = await Promise.all([
      this.searchOfficialSources(query, 6),
      this.searchAcademicSources(query, 4),
      this.searchLegalContent(query, 8)
    ])

    return {
      official,
      academic,
      general
    }
  }
}

/**
 * Instancia singleton del cliente FireCrawl
 */
export const fireCrawlSearchClient = new FireCrawlSearchClient()

/**
 * Función de conveniencia para búsquedas rápidas
 */
export async function searchWithFireCrawl(
  query: string,
  options?: Partial<FireCrawlSearchOptions>
): Promise<FireCrawlSearchResult> {
  return await fireCrawlSearchClient.search({
    query,
    limit: 10,
    country: 'CO',
    language: 'es',
    includeContent: true,
    ...options
  })
}

/**
 * Función especializada para búsquedas legales
 */
export async function searchLegalWithFireCrawl(
  query: string,
  limit: number = 8
): Promise<FireCrawlSearchResult> {
  return await fireCrawlSearchClient.searchLegalContent(query, limit)
}








