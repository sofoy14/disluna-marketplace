import { extractUrlContent } from "@/lib/tools/web-search"
import { fireCrawlExtractionClient, FireCrawlExtractionResult } from "@/lib/tools/firecrawl-extraction-only"

export interface EnhancedContentExtraction {
  content: string
  title: string
  description: string
  extractionMethod: 'firecrawl' | 'jina-ai' | 'fallback'
  success: boolean
  error?: string
}

/**
 * Extrae contenido de una URL usando FireCrawl como primera opción y Jina AI como fallback
 */
export async function extractContentEnhanced(url: string): Promise<EnhancedContentExtraction> {
  console.log(`🔍 Extracción mejorada de contenido: ${url}`)
  
  try {
    // PRIMERA OPCIÓN: FireCrawl para extracción de alta calidad
    const fireCrawlResult = await fireCrawlExtractionClient.extractContent(url)
    
    if (fireCrawlResult.success && fireCrawlResult.content && fireCrawlResult.content.length > 100) {
      console.log(`✅ FireCrawl exitoso: ${fireCrawlResult.content.length} caracteres`)
      
      return {
        content: fireCrawlResult.content,
        title: fireCrawlResult.title || '',
        description: fireCrawlResult.description || '',
        extractionMethod: 'firecrawl',
        success: true
      }
    }
    
    console.log(`⚠️ FireCrawl falló o contenido insuficiente, probando Jina AI`)
    
  } catch (error) {
    console.log(`⚠️ Error en FireCrawl: ${error}, probando Jina AI`)
  }
  
  try {
    // SEGUNDA OPCIÓN: Jina AI como fallback
    const jinaContent = await extractUrlContent(url)
    
    if (jinaContent && jinaContent.length > 100) {
      console.log(`✅ Jina AI exitoso: ${jinaContent.length} caracteres`)
      
      return {
        content: jinaContent,
        title: '',
        description: '',
        extractionMethod: 'jina-ai',
        success: true
      }
    }
    
    console.log(`⚠️ Jina AI falló o contenido insuficiente`)
    
  } catch (error) {
    console.log(`⚠️ Error en Jina AI: ${error}`)
  }
  
  // FALLBACK: Respuesta básica
  console.log(`❌ Ambas extracciones fallaron`)
  
  return {
    content: '',
    title: '',
    description: '',
    extractionMethod: 'fallback',
    success: false,
    error: 'No se pudo extraer contenido de la URL'
  }
}

/**
 * Extrae contenido de múltiples URLs usando FireCrawl + Jina AI
 */
export async function extractMultipleContentEnhanced(urls: string[]): Promise<Map<string, EnhancedContentExtraction>> {
  console.log(`🔍 Extracción mejorada múltiple: ${urls.length} URLs`)
  
  const results = new Map<string, EnhancedContentExtraction>()
  
  // Procesar URLs en paralelo (máximo 5 a la vez)
  const batchSize = 5
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (url) => {
      const result = await extractContentEnhanced(url)
      return { url, result }
    })
    
    const batchResults = await Promise.all(batchPromises)
    
    batchResults.forEach(({ url, result }) => {
      results.set(url, result)
    })
    
    // Pausa entre lotes para evitar rate limiting
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  const successfulExtractions = Array.from(results.values()).filter(r => r.success).length
  console.log(`✅ Extracción múltiple completada: ${successfulExtractions}/${urls.length} exitosas`)
  
  return results
}

/**
 * Verifica la disponibilidad de los servicios de extracción
 */
export async function checkExtractionServices(): Promise<{
  firecrawl: boolean
  jina: boolean
}> {
  console.log(`🔍 Verificando servicios de extracción`)
  
  const [firecrawlAvailable, jinaAvailable] = await Promise.all([
    fireCrawlExtractionClient.isAvailable(),
    testJinaAvailability()
  ])
  
  console.log(`📊 Servicios disponibles:`)
  console.log(`   🔥 FireCrawl: ${firecrawlAvailable ? '✅' : '❌'}`)
  console.log(`   🤖 Jina AI: ${jinaAvailable ? '✅' : '❌'}`)
  
  return {
    firecrawl: firecrawlAvailable,
    jina: jinaAvailable
  }
}

/**
 * Prueba la disponibilidad de Jina AI
 */
async function testJinaAvailability(): Promise<boolean> {
  try {
    await extractUrlContent('https://example.com')
    return true
  } catch {
    return false
  }
}








