import axios from 'axios'

export interface FireCrawlExtractionResult {
  success: boolean
  content?: string
  title?: string
  description?: string
  error?: string
}

/**
 * Cliente para FireCrawl v2 - Solo para extracción de contenido
 * NO incluye funcionalidad de búsqueda (search)
 */
export class FireCrawlExtractionClient {
  private apiKey: string
  private baseUrl: string = 'https://api.firecrawl.dev/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || ''
    
    if (!this.apiKey) {
      console.warn('⚠️ FireCrawl API Key no configurada. Define FIRECRAWL_API_KEY.')
    }
  }

  /**
   * Extrae contenido de una URL usando FireCrawl v2
   */
  async extractContent(url: string): Promise<FireCrawlExtractionResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'FireCrawl API Key no configurada'
      }
    }

    try {
      console.log(`🔥 FireCrawl Extraction: ${url}`)
      
      const response = await axios.post(
        `${this.baseUrl}/scrape`,
        {
          url: url,
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          maxLength: 8000,
          waitFor: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 segundos timeout
        }
      )

      const data = response.data?.data
      if (data) {
        console.log(`✅ FireCrawl Extraction exitosa: ${data.markdown?.length || 0} caracteres`)
        
        return {
          success: true,
          content: data.markdown || data.html || '',
          title: data.metadata?.title || '',
          description: data.metadata?.description || ''
        }
      }

      return {
        success: false,
        error: 'No se pudo extraer contenido'
      }

    } catch (error: any) {
      console.error('❌ Error en FireCrawl Extraction:', error.message)
      
      return {
        success: false,
        error: error.message || 'Error desconocido en FireCrawl Extraction'
      }
    }
  }

  /**
   * Extrae contenido de múltiples URLs en paralelo
   */
  async extractMultipleUrls(urls: string[]): Promise<Map<string, FireCrawlExtractionResult>> {
    console.log(`🔥 FireCrawl Extraction múltiple: ${urls.length} URLs`)
    
    const results = new Map<string, FireCrawlExtractionResult>()
    
    // Procesar en lotes de 3 para evitar rate limiting
    const batchSize = 3
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (url) => {
        const result = await this.extractContent(url)
        return { url, result }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      batchResults.forEach(({ url, result }) => {
        results.set(url, result)
      })
      
      // Pausa entre lotes
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`✅ FireCrawl Extraction múltiple completada: ${results.size} URLs procesadas`)
    return results
  }

  /**
   * Verifica si FireCrawl está disponible
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false
    
    try {
      // Hacer una prueba simple con una URL conocida
      const testResult = await this.extractContent('https://example.com')
      return testResult.success || testResult.error?.includes('timeout')
    } catch {
      return false
    }
  }
}

/**
 * Instancia singleton del cliente FireCrawl
 */
export const fireCrawlExtractionClient = new FireCrawlExtractionClient()

/**
 * Función de conveniencia para extracción rápida
 */
export async function extractWithFireCrawl(url: string): Promise<FireCrawlExtractionResult> {
  return await fireCrawlExtractionClient.extractContent(url)
}

/**
 * Función de conveniencia para extracción múltiple
 */
export async function extractMultipleWithFireCrawl(urls: string[]): Promise<Map<string, FireCrawlExtractionResult>> {
  return await fireCrawlExtractionClient.extractMultipleUrls(urls)
}












