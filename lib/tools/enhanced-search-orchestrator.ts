// CONFIRMAR USO ANTES DE ELIMINACIÓN - Orquestador redundante con unified-deep-research-orchestrator.ts
import { searchLegalSpecialized } from "@/lib/tools/legal/legal-search-specialized"
import { extractUrlContent } from "@/lib/tools/web-search"

export interface EnhancedSearchResult {
  title: string
  url: string
  description: string
  content: string
  source: 'serper' | 'firecrawl' | 'jina'
  quality: number
  relevance: number
  authority: number
  freshness: number
  metadata: {
    publishedTime?: string
    author?: string
    domain: string
    searchEngine: string
    extractionMethod: string
  }
}

export interface SearchOrchestrationOptions {
  query: string
  maxResults?: number
  includeOfficialSources?: boolean
  includeAcademicSources?: boolean
  includeGeneralSources?: boolean
  prioritizeFreshness?: boolean
  prioritizeAuthority?: boolean
}

/**
 * Orquestador mejorado que combina Serper, FireCrawl Search v2 y Jina AI
 * para maximizar la calidad y precisión de las búsquedas
 */
export class EnhancedSearchOrchestrator {
  
  /**
   * Ejecuta búsqueda orquestada con múltiples fuentes
   */
  async executeOrchestratedSearch(options: SearchOrchestrationOptions): Promise<EnhancedSearchResult[]> {
    const {
      query,
      maxResults = 20,
      includeOfficialSources = true,
      includeAcademicSources = true,
      includeGeneralSources = true,
      prioritizeFreshness = true,
      prioritizeAuthority = true
    } = options

    console.log(`\n🔍 ORQUESTACIÓN MEJORADA DE BÚSQUEDA`)
    console.log(`📝 Query: "${query}"`)
    console.log(`🎯 Máximo resultados: ${maxResults}`)
    console.log(`🏛️ Fuentes oficiales: ${includeOfficialSources ? 'SÍ' : 'NO'}`)
    console.log(`🎓 Fuentes académicas: ${includeAcademicSources ? 'SÍ' : 'NO'}`)
    console.log(`🌐 Fuentes generales: ${includeGeneralSources ? 'SÍ' : 'NO'}`)
    console.log(`${'='.repeat(80)}`)

    const allResults: EnhancedSearchResult[] = []
    const startTime = Date.now()

    try {
      // FASE 1: Búsqueda con Serper (fuentes especializadas)
      if (includeOfficialSources || includeAcademicSources) {
        console.log(`\n🔍 FASE 1: BÚSQUEDA CON SERPER`)
        const serperResults = await this.searchWithSerper(query, {
          includeOfficial: includeOfficialSources,
          includeAcademic: includeAcademicSources,
          maxResults: Math.floor(maxResults * 0.4) // 40% de los resultados
        })
        allResults.push(...serperResults)
        console.log(`✅ Serper: ${serperResults.length} resultados`)
      }

      // FASE 2: Búsqueda adicional con Serper (ya que FireCrawl no funciona)
      if (includeGeneralSources) {
        console.log(`\n🔍 FASE 2: BÚSQUEDA ADICIONAL CON SERPER`)
        const additionalSerperResults = await this.searchWithAdditionalSerper(query, {
          maxResults: Math.floor(maxResults * 0.4) // 40% de los resultados adicionales
        })
        allResults.push(...additionalSerperResults)
        console.log(`✅ Serper adicional: ${additionalSerperResults.length} resultados`)
      }

      // FASE 3: Enriquecimiento con Jina AI para URLs faltantes
      console.log(`\n🤖 FASE 3: ENRIQUECIMIENTO CON JINA AI`)
      const enrichedResults = await this.enrichWithJinaAI(allResults, {
        maxResults: Math.floor(maxResults * 0.2) // 20% adicional
      })
      
      // Agregar resultados enriquecidos que no estén duplicados
      const existingUrls = new Set(allResults.map(r => r.url))
      const newEnrichedResults = enrichedResults.filter(r => !existingUrls.has(r.url))
      allResults.push(...newEnrichedResults)
      console.log(`✅ Jina AI: ${newEnrichedResults.length} resultados nuevos`)

      // FASE 4: Optimización y ranking
      console.log(`\n📊 FASE 4: OPTIMIZACIÓN Y RANKING`)
      const optimizedResults = this.optimizeAndRankResults(allResults, {
        prioritizeFreshness,
        prioritizeAuthority,
        maxResults
      })

      const totalDuration = Date.now() - startTime
      console.log(`\n🎯 ORQUESTACIÓN COMPLETADA`)
      console.log(`📊 Total resultados: ${optimizedResults.length}`)
      console.log(`⏱️ Duración: ${(totalDuration / 1000).toFixed(1)}s`)
      console.log(`🎯 Calidad promedio: ${(optimizedResults.reduce((sum, r) => sum + r.quality, 0) / optimizedResults.length).toFixed(1)}/10`)
      console.log(`${'='.repeat(80)}`)

      return optimizedResults

    } catch (error) {
      console.error('❌ Error en orquestación de búsqueda:', error)
      
      // Fallback a búsqueda simple con Serper
      console.log(`🔄 Fallback a búsqueda simple con Serper`)
      const fallbackResults = await this.searchWithSerper(query, {
        includeOfficial: true,
        includeAcademic: true,
        maxResults: Math.min(maxResults, 10)
      })
      
      return fallbackResults
    }
  }

  /**
   * Búsqueda con Serper API
   */
  private async searchWithSerper(
    query: string,
    options: {
      includeOfficial: boolean
      includeAcademic: boolean
      maxResults: number
    }
  ): Promise<EnhancedSearchResult[]> {
    try {
      const searchResult = await searchLegalSpecialized(query, {
        maxResults: options.maxResults,
        prioritizeOfficial: options.includeOfficial,
        prioritizeAcademic: options.includeAcademic
      })

      const results: EnhancedSearchResult[] = []

      for (const result of searchResult.results) {
        try {
          // Extraer contenido usando solo Jina AI
          const content = await extractUrlContent(result.url)
          
          results.push({
            title: result.title,
            url: result.url,
            description: result.description || '',
            content: content || result.description || '',
            source: 'serper',
            quality: this.calculateQuality(result, content),
            relevance: this.calculateRelevance(query, result.title, result.description),
            authority: this.calculateAuthority(result.url),
            freshness: this.calculateFreshness(result.publishedTime),
            metadata: {
              publishedTime: result.publishedTime,
              author: result.author,
              domain: new URL(result.url).hostname,
              searchEngine: 'serper',
              extractionMethod: content ? 'jina-ai' : 'description'
            }
          })
        } catch (error) {
          console.warn(`⚠️ Error procesando resultado Serper: ${result.url}`)
        }
      }

      return results
    } catch (error) {
      console.error('❌ Error en búsqueda Serper:', error)
      return []
    }
  }

  /**
   * Búsqueda adicional con Serper (reemplaza FireCrawl que no funciona)
   */
  private async searchWithAdditionalSerper(
    query: string,
    options: { maxResults: number }
  ): Promise<EnhancedSearchResult[]> {
    try {
      // Usar Serper para búsquedas generales adicionales
      const searchResult = await searchLegalSpecialized(query, {
        maxResults: options.maxResults,
        prioritizeOfficial: false,
        prioritizeAcademic: false
      })

      const results: EnhancedSearchResult[] = []

      for (const result of searchResult.results) {
        try {
          // Extraer contenido usando solo Jina AI
          const content = await extractUrlContent(result.url)
          
          results.push({
            title: result.title,
            url: result.url,
            description: result.description || '',
            content: content || result.description || '',
            source: 'serper',
            quality: this.calculateQuality(result, content),
            relevance: this.calculateRelevance(query, result.title, result.description),
            authority: this.calculateAuthority(result.url),
            freshness: this.calculateFreshness(result.publishedTime),
            metadata: {
              publishedTime: result.publishedTime,
              author: result.author,
              domain: new URL(result.url).hostname,
              searchEngine: 'serper-additional',
              extractionMethod: content ? 'jina-ai' : 'description'
            }
          })
        } catch (error) {
          console.warn(`⚠️ Error procesando resultado Serper adicional: ${result.url}`)
        }
      }

      return results
    } catch (error) {
      console.error('❌ Error en búsqueda Serper adicional:', error)
      return []
    }
  }

  /**
   * Enriquecimiento con Jina AI para URLs sin contenido
   */
  private async enrichWithJinaAI(
    results: EnhancedSearchResult[],
    options: { maxResults: number }
  ): Promise<EnhancedSearchResult[]> {
    const enrichedResults: EnhancedSearchResult[] = []
    const urlsToEnrich = results
      .filter(r => !r.content || r.content.length < 100)
      .slice(0, options.maxResults)

    console.log(`🤖 Enriqueciendo ${urlsToEnrich.length} URLs con Jina AI`)

    for (const result of urlsToEnrich) {
      try {
        const content = await extractUrlContent(result.url)
        if (content && content.length > 100) {
          enrichedResults.push({
            ...result,
            content,
            source: 'jina' as const,
            quality: Math.min(10, result.quality + 1), // Mejorar calidad por contenido
            metadata: {
              ...result.metadata,
              extractionMethod: 'jina-ai-enhanced'
            }
          })
        }
      } catch (error) {
        console.warn(`⚠️ Error enriqueciendo con Jina AI: ${result.url}`)
      }
    }

    return enrichedResults
  }

  /**
   * Optimiza y rankea los resultados
   */
  private optimizeAndRankResults(
    results: EnhancedSearchResult[],
    options: {
      prioritizeFreshness: boolean
      prioritizeAuthority: boolean
      maxResults: number
    }
  ): EnhancedSearchResult[] {
    // Eliminar duplicados por URL
    const uniqueResults = results.reduce((acc, result) => {
      const existing = acc.find(r => r.url === result.url)
      if (!existing) {
        acc.push(result)
      } else if (result.quality > existing.quality) {
        // Reemplazar con versión de mayor calidad
        const index = acc.findIndex(r => r.url === result.url)
        acc[index] = result
      }
      return acc
    }, [] as EnhancedSearchResult[])

    // Calcular score final
    const scoredResults = uniqueResults.map(result => {
      let score = result.quality * 0.3 + result.relevance * 0.3 + result.authority * 0.2 + result.freshness * 0.2
      
      // Bonificaciones
      if (result.source === 'firecrawl') score += 0.5 // Bonus por FireCrawl
      if (result.metadata.domain.includes('.gov.co')) score += 1.0 // Bonus por dominio oficial
      if (result.metadata.domain.includes('.edu.co')) score += 0.8 // Bonus por dominio académico
      if (result.content && result.content.length > 500) score += 0.3 // Bonus por contenido extenso
      
      return { ...result, finalScore: score }
    })

    // Ordenar por score final
    const rankedResults = scoredResults
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, options.maxResults)

    console.log(`📊 Resultados optimizados: ${rankedResults.length}`)
    console.log(`🏆 Top 3 resultados:`)
    rankedResults.slice(0, 3).forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (Score: ${result.finalScore.toFixed(2)})`)
    })

    return rankedResults
  }

  /**
   * Calcula la calidad de un resultado Serper
   */
  private calculateQuality(result: any, content: string): number {
    let quality = 5 // Base

    if (content && content.length > 200) quality += 2
    if (result.description && result.description.length > 100) quality += 1
    if (result.publishedTime) quality += 1
    if (result.author) quality += 1

    return Math.min(10, quality)
  }


  /**
   * Calcula la relevancia basada en la query
   */
  private calculateRelevance(query: string, title: string, description: string): number {
    const queryWords = query.toLowerCase().split(' ')
    const titleLower = title.toLowerCase()
    const descriptionLower = description.toLowerCase()

    let relevance = 0
    queryWords.forEach(word => {
      if (titleLower.includes(word)) relevance += 2
      if (descriptionLower.includes(word)) relevance += 1
    })

    return Math.min(10, relevance)
  }

  /**
   * Calcula la autoridad basada en el dominio
   */
  private calculateAuthority(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase()
      
      if (domain.includes('.gov.co')) return 9
      if (domain.includes('.edu.co')) return 8
      if (domain.includes('corteconstitucional')) return 9
      if (domain.includes('minjusticia')) return 9
      if (domain.includes('superintendencias')) return 8
      if (domain.includes('congreso')) return 8
      if (domain.includes('universidad')) return 7
      if (domain.includes('academia')) return 6
      
      return 5 // Base para otros dominios
    } catch {
      return 3
    }
  }

  /**
   * Calcula la frescura basada en la fecha de publicación
   */
  private calculateFreshness(publishedTime?: string): number {
    if (!publishedTime) return 5

    try {
      const published = new Date(publishedTime)
      const now = new Date()
      const daysDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24)

      if (daysDiff < 30) return 10
      if (daysDiff < 90) return 8
      if (daysDiff < 365) return 6
      if (daysDiff < 730) return 4
      
      return 2
    } catch {
      return 5
    }
  }
}

/**
 * Instancia singleton del orquestador
 */
export const enhancedSearchOrchestrator = new EnhancedSearchOrchestrator()

/**
 * Función de conveniencia para búsquedas orquestadas
 */
export async function executeEnhancedSearch(
  query: string,
  options?: Partial<SearchOrchestrationOptions>
): Promise<EnhancedSearchResult[]> {
  return await enhancedSearchOrchestrator.executeOrchestratedSearch({
    query,
    maxResults: 20,
    includeOfficialSources: true,
    includeAcademicSources: true,
    includeGeneralSources: true,
    prioritizeFreshness: true,
    prioritizeAuthority: true,
    ...options
  })
}
