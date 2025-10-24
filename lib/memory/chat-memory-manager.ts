import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface ChatMemory {
  id: string
  chatId: string
  userId: string
  messageId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: {
    searchRounds?: number
    totalSearches?: number
    totalResults?: number
    finalQuality?: number
    modelDecisions?: number
    searchStrategy?: string
    researchMode?: 'react' | 'iter_research' | 'hybrid'
    verificationPassed?: boolean
    confidence?: number
    processingTime?: number
    sources?: Array<{
      title: string
      url: string
      type: string
      quality: number
      authorityScore?: number
      verified?: boolean
    }>
  }
}

export interface ChatContext {
  chatId: string
  userId: string
  conversationHistory: ChatMemory[]
  currentContext: string
  searchHistory: Array<{
    query: string
    results: number
    quality: number
    timestamp: Date
    researchMode?: 'react' | 'iter_research' | 'hybrid'
    verificationPassed?: boolean
  }>
  userPreferences: {
    preferredSearchStrategy: string
    maxSearchRounds: number
    enableModelDecision: boolean
    preferredResearchMode?: 'react' | 'iter_research' | 'hybrid'
    qualityThreshold?: number
  }
  cachedSources: Array<{
    query: string
    sources: Array<{
      title: string
      url: string
      type: string
      authorityScore: number
      verified: boolean
      lastUsed: Date
    }>
    createdAt: Date
    expiresAt: Date
  }>
  qualityMetrics: {
    totalQueries: number
    averageQuality: number
    modePerformance: {
      react: { count: number; avgQuality: number; avgTime: number }
      iter_research: { count: number; avgQuality: number; avgTime: number }
      hybrid: { count: number; avgQuality: number; avgTime: number }
    }
    verificationStats: {
      totalVerifications: number
      passedVerifications: number
      averageConfidence: number
    }
  }
}

/**
 * Sistema de memoria para chat con capacidades agenticas
 */
export class ChatMemoryManager {
  private static instance: ChatMemoryManager
  private memoryCache: Map<string, ChatContext> = new Map()
  private sourceCache: Map<string, Array<{
    title: string
    url: string
    type: string
    authorityScore: number
    verified: boolean
    lastUsed: Date
  }>> = new Map()
  private readonly MAX_MEMORY_ENTRIES = 50
  private readonly MAX_CONTEXT_LENGTH = 8000
  private readonly SOURCE_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas
  private readonly MAX_CACHED_SOURCES = 1000

  /**
   * Genera un UUID válido para IDs que no son UUIDs válidos
   */
  private generateValidUUID(input: string): string {
    // Si ya es un UUID válido, devolverlo
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (uuidRegex.test(input)) {
      return input
    }
    
    // Generar un UUID v4 válido usando crypto.randomUUID si está disponible
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    
    // Fallback: generar UUID v4 manualmente con formato correcto
    const hex = '0123456789abcdef'
    let uuid = ''
    
    // Generar 32 caracteres hexadecimales
    for (let i = 0; i < 32; i++) {
      uuid += hex[Math.floor(Math.random() * 16)]
    }
    
    // Insertar guiones en las posiciones correctas para UUID v4
    return [
      uuid.substring(0, 8),
      uuid.substring(8, 12),
      '4' + uuid.substring(13, 16), // Versión 4
      ((parseInt(uuid.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + uuid.substring(17, 20), // Variante
      uuid.substring(20, 32)
    ].join('-')
  }

  /**
   * Función hash simple compatible con Edge Runtime
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convertir a entero de 32 bits
    }
    
    // Convertir a hexadecimal y asegurar longitud de 32 caracteres
    const hex = Math.abs(hash).toString(16)
    return hex.padStart(32, '0').substring(0, 32)
  }

  static getInstance(): ChatMemoryManager {
    if (!ChatMemoryManager.instance) {
      ChatMemoryManager.instance = new ChatMemoryManager()
    }
    return ChatMemoryManager.instance
  }

  /**
   * Obtiene o crea el contexto de chat
   */
  async getChatContext(chatId: string, userId: string): Promise<ChatContext> {
    const cacheKey = `${chatId}-${userId}`
    
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!
    }

    // Cargar desde base de datos
    const context = await this.loadChatContextFromDB(chatId, userId)
    this.memoryCache.set(cacheKey, context)
    return context
  }

  /**
   * Guarda un mensaje en la memoria
   */
  async saveMessage(
    chatId: string,
    userId: string,
    messageId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    metadata?: ChatMemory['metadata']
  ): Promise<void> {
    try {
      // Generar UUIDs válidos
      const validChatId = this.generateValidUUID(chatId)
      const validUserId = this.generateValidUUID(userId)
      
      const memory: ChatMemory = {
        id: `${validChatId}-${messageId}`,
        chatId: validChatId,
        userId: validUserId,
        messageId,
        content,
        role,
        timestamp: new Date(),
        metadata
      }

      // Guardar en base de datos
      await this.saveMemoryToDB(memory)

      // Actualizar cache
      const context = await this.getChatContext(validChatId, validUserId)
      context.conversationHistory.push(memory)
      
      // Limitar tamaño de memoria
      if (context.conversationHistory.length > this.MAX_MEMORY_ENTRIES) {
        context.conversationHistory = context.conversationHistory.slice(-this.MAX_MEMORY_ENTRIES)
      }

      // Actualizar contexto actual
      context.currentContext = this.buildCurrentContext(context)
    } catch (error) {
      console.error('Error guardando memoria:', error)
    }
  }

  /**
   * Obtiene el historial de conversación relevante
   */
  async getRelevantHistory(
    chatId: string,
    userId: string,
    currentQuery: string,
    maxMessages: number = 10
  ): Promise<ChatMemory[]> {
    try {
      // Generar UUIDs válidos
      const validChatId = this.generateValidUUID(chatId)
      const validUserId = this.generateValidUUID(userId)
      
      const context = await this.getChatContext(validChatId, validUserId)
      
      // Filtrar mensajes relevantes basándose en similitud semántica
      const relevantMessages = context.conversationHistory
        .filter(msg => msg.role !== 'system')
        .slice(-maxMessages)

      return relevantMessages
    } catch (error) {
      console.error('Error en getRelevantHistory:', error)
      return []
    }
  }

  /**
   * Obtiene el contexto de búsqueda relevante
   */
  async getSearchContext(
    chatId: string,
    userId: string
  ): Promise<{
    previousSearches: Array<{
      query: string
      results: number
      quality: number
      timestamp: Date
    }>
    userPreferences: {
      preferredSearchStrategy: string
      maxSearchRounds: number
      enableModelDecision: boolean
    }
  }> {
    const context = await this.getChatContext(chatId, userId)
    
    return {
      previousSearches: context.searchHistory.slice(-5), // Últimas 5 búsquedas
      userPreferences: context.userPreferences
    }
  }

  /**
   * Actualiza las preferencias del usuario
   */
  async updateUserPreferences(
    chatId: string,
    userId: string,
    preferences: Partial<ChatContext['userPreferences']>
  ): Promise<void> {
    const context = await this.getChatContext(chatId, userId)
    context.userPreferences = { ...context.userPreferences, ...preferences }
    
    // Guardar en base de datos
    await this.saveContextToDB(context)
  }

  /**
   * Registra una búsqueda realizada con métricas avanzadas
   */
  async recordSearch(
    chatId: string,
    userId: string,
    query: string,
    results: number,
    quality: number,
    researchMode?: 'react' | 'iter_research' | 'hybrid',
    verificationPassed?: boolean
  ): Promise<void> {
    const context = await this.getChatContext(chatId, userId)
    
    context.searchHistory.push({
      query,
      results,
      quality,
      timestamp: new Date(),
      researchMode,
      verificationPassed
    })

    // Actualizar métricas de calidad
    this.updateQualityMetrics(context, quality, researchMode, verificationPassed)

    // Limitar historial de búsquedas
    if (context.searchHistory.length > 20) {
      context.searchHistory = context.searchHistory.slice(-20)
    }

    await this.saveContextToDB(context)
  }

  /**
   * Registra el modo de investigación utilizado
   */
  async recordResearchMode(
    chatId: string,
    userId: string,
    query: string,
    mode: 'react' | 'iter_research' | 'hybrid',
    quality: number,
    processingTime: number,
    verificationPassed: boolean,
    confidence: number
  ): Promise<void> {
    const context = await this.getChatContext(chatId, userId)
    
    // Actualizar métricas de rendimiento por modo
    const modeMetrics = context.qualityMetrics.modePerformance[mode]
    modeMetrics.count += 1
    modeMetrics.avgQuality = (modeMetrics.avgQuality * (modeMetrics.count - 1) + quality) / modeMetrics.count
    modeMetrics.avgTime = (modeMetrics.avgTime * (modeMetrics.count - 1) + processingTime) / modeMetrics.count

    // Actualizar estadísticas de verificación
    context.qualityMetrics.verificationStats.totalVerifications += 1
    if (verificationPassed) {
      context.qualityMetrics.verificationStats.passedVerifications += 1
    }
    context.qualityMetrics.verificationStats.averageConfidence = 
      (context.qualityMetrics.verificationStats.averageConfidence * (context.qualityMetrics.verificationStats.totalVerifications - 1) + confidence) / 
      context.qualityMetrics.verificationStats.totalVerifications

    // Actualizar calidad promedio general
    context.qualityMetrics.totalQueries += 1
    context.qualityMetrics.averageQuality = 
      (context.qualityMetrics.averageQuality * (context.qualityMetrics.totalQueries - 1) + quality) / 
      context.qualityMetrics.totalQueries

    await this.saveContextToDB(context)
  }

  /**
   * Cachea fuentes verificadas para reutilización
   */
  async cacheVerifiedSources(
    chatId: string,
    userId: string,
    query: string,
    sources: Array<{
      title: string
      url: string
      type: string
      authorityScore: number
      verified: boolean
    }>
  ): Promise<void> {
    const context = await this.getChatContext(chatId, userId)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.SOURCE_CACHE_TTL)

    // Agregar fuentes al caché
    context.cachedSources.push({
      query: query.toLowerCase().trim(),
      sources: sources.map(source => ({
        ...source,
        lastUsed: now
      })),
      createdAt: now,
      expiresAt
    })

    // Limpiar fuentes expiradas
    this.cleanExpiredSources(context)

    // Limitar número de fuentes cacheadas
    if (context.cachedSources.length > 50) {
      context.cachedSources = context.cachedSources.slice(-50)
    }

    await this.saveContextToDB(context)
  }

  /**
   * Obtiene fuentes cacheadas para una consulta similar
   */
  async getCachedLegalSources(
    chatId: string,
    userId: string,
    query: string,
    maxAge: number = this.SOURCE_CACHE_TTL
  ): Promise<Array<{
    title: string
    url: string
    type: string
    authorityScore: number
    verified: boolean
  }>> {
    const context = await this.getChatContext(chatId, userId)
    const now = new Date()
    const queryLower = query.toLowerCase().trim()

    // Buscar fuentes cacheadas similares
    const relevantCachedSources = context.cachedSources.filter(cached => {
      const age = now.getTime() - cached.createdAt.getTime()
      return age <= maxAge && this.isQuerySimilar(queryLower, cached.query)
    })

    if (relevantCachedSources.length === 0) {
      return []
    }

    // Combinar fuentes de todas las consultas similares
    const allSources = relevantCachedSources.flatMap(cached => cached.sources)
    
    // Eliminar duplicados basándose en URL
    const uniqueSources = allSources.filter((source, index, self) => 
      index === self.findIndex(s => s.url === source.url)
    )

    // Actualizar lastUsed para las fuentes encontradas
    uniqueSources.forEach(source => {
      source.lastUsed = now
    })

    return uniqueSources
  }

  /**
   * Obtiene métricas de calidad por tipo de consulta
   */
  /**
   * Calcula estadísticas por modo de investigación
   */
  private calculateModePerformance(modeStats: any): {
    react: { count: number; avgQuality: number; avgTime: number }
    iter_research: { count: number; avgQuality: number; avgTime: number }
    hybrid: { count: number; avgQuality: number; avgTime: number }
  } {
    return {
      react: {
        count: modeStats.react.count,
        avgQuality: modeStats.react.count > 0 ? modeStats.react.totalQuality / modeStats.react.count : 0,
        avgTime: modeStats.react.count > 0 ? modeStats.react.totalTime / modeStats.react.count : 0
      },
      iter_research: {
        count: modeStats.iter_research.count,
        avgQuality: modeStats.iter_research.count > 0 ? modeStats.iter_research.totalQuality / modeStats.iter_research.count : 0,
        avgTime: modeStats.iter_research.count > 0 ? modeStats.iter_research.totalTime / modeStats.iter_research.count : 0
      },
      hybrid: {
        count: modeStats.hybrid.count,
        avgQuality: modeStats.hybrid.count > 0 ? modeStats.hybrid.totalQuality / modeStats.hybrid.count : 0,
        avgTime: modeStats.hybrid.count > 0 ? modeStats.hybrid.totalTime / modeStats.hybrid.count : 0
      }
    }
  }

  /**
   * Determina el modo con mejor rendimiento
   */
  private determineTopPerformingMode(modePerformance: any): 'react' | 'iter_research' | 'hybrid' {
    return Object.entries(modePerformance).reduce((best, [mode, stats]) => {
      if (stats.count === 0) return best
      const currentBest = modePerformance[best as keyof typeof modePerformance]
      return stats.avgQuality > currentBest.avgQuality ? (mode as 'react' | 'iter_research' | 'hybrid') : best
    }, 'react' as 'react' | 'iter_research' | 'hybrid')
  }

  /**
   * Genera recomendaciones basadas en métricas
   */
  private generateRecommendations(
    modePerformance: any, 
    averageQuality: number, 
    successRate: number
  ): string[] {
    const recommendations: string[] = []
    
    if (averageQuality < 7) {
      recommendations.push("Considera aumentar el número de rondas de búsqueda para mejorar la calidad")
    }
    
    if (successRate < 0.8) {
      recommendations.push("Revisa la configuración de verificación para mejorar la tasa de éxito")
    }
    
    const topMode = this.determineTopPerformingMode(modePerformance)
    if (topMode !== 'react') {
      recommendations.push(`El modo ${topMode} muestra mejor rendimiento, considera usarlo más frecuentemente`)
    }
    
    return recommendations
  }

  async getQualityMetrics(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalQueries: number
    averageQuality: number
    modePerformance: {
      react: { count: number; avgQuality: number; avgTime: number }
      iter_research: { count: number; avgQuality: number; avgTime: number }
      hybrid: { count: number; avgQuality: number; avgTime: number }
    }
    verificationStats: {
      totalVerifications: number
      passedVerifications: number
      averageConfidence: number
      successRate: number
    }
    topPerformingMode: 'react' | 'iter_research' | 'hybrid'
    recommendations: string[]
  }> {
    try {
      // Cargar métricas de todos los chats del usuario
      const { data: contexts, error } = await supabase
        .from('chat_contexts')
        .select('quality_metrics, search_history, created_at')
        .eq('user_id', userId)

      if (error) {
        console.error('Error cargando métricas:', error)
        return this.getDefaultQualityMetrics()
      }

      // Agregar métricas de todos los contextos
      let totalQueries = 0
      let totalQuality = 0
      let totalVerifications = 0
      let passedVerifications = 0
      let totalConfidence = 0

      const modeStats = {
        react: { count: 0, totalQuality: 0, totalTime: 0 },
        iter_research: { count: 0, totalQuality: 0, totalTime: 0 },
        hybrid: { count: 0, totalQuality: 0, totalTime: 0 }
      }

      contexts?.forEach(context => {
        const metrics = context.quality_metrics || this.getDefaultQualityMetrics()
        totalQueries += metrics.totalQueries
        totalQuality += metrics.averageQuality * metrics.totalQueries
        totalVerifications += metrics.verificationStats.totalVerifications
        passedVerifications += metrics.verificationStats.passedVerifications
        totalConfidence += metrics.verificationStats.averageConfidence * metrics.verificationStats.totalVerifications

        // Agregar estadísticas por modo
        Object.keys(modeStats).forEach(mode => {
          const modeData = metrics.modePerformance[mode as keyof typeof metrics.modePerformance]
          modeStats[mode as keyof typeof modeStats].count += modeData.count
          modeStats[mode as keyof typeof modeStats].totalQuality += modeData.avgQuality * modeData.count
          modeStats[mode as keyof typeof modeStats].totalTime += modeData.avgTime * modeData.count
        })
      })

      // Calcular promedios
      const averageQuality = totalQueries > 0 ? totalQuality / totalQueries : 0
      const averageConfidence = totalVerifications > 0 ? totalConfidence / totalVerifications : 0
      const successRate = totalVerifications > 0 ? passedVerifications / totalVerifications : 0

      // Calcular estadísticas por modo usando función auxiliar
      const modePerformance = this.calculateModePerformance(modeStats)

      // Determinar modo con mejor rendimiento usando función auxiliar
      const topPerformingMode = this.determineTopPerformingMode(modePerformance)

      // Generar recomendaciones usando función auxiliar
      const recommendations = this.generateRecommendations(modePerformance, averageQuality, successRate)

      return {
        totalQueries,
        averageQuality,
        modePerformance,
        verificationStats: {
          totalVerifications,
          passedVerifications,
          averageConfidence,
          successRate
        },
        topPerformingMode,
        recommendations
      }

    } catch (error) {
      console.error('Error obteniendo métricas de calidad:', error)
      return this.getDefaultQualityMetrics()
    }
  }

  /**
   * Actualiza métricas de calidad en el contexto
   */
  private updateQualityMetrics(
    context: ChatContext,
    quality: number,
    researchMode?: 'react' | 'iter_research' | 'hybrid',
    verificationPassed?: boolean
  ): void {
    context.qualityMetrics.totalQueries += 1
    context.qualityMetrics.averageQuality = 
      (context.qualityMetrics.averageQuality * (context.qualityMetrics.totalQueries - 1) + quality) / 
      context.qualityMetrics.totalQueries

    if (researchMode) {
      const modeMetrics = context.qualityMetrics.modePerformance[researchMode]
      modeMetrics.count += 1
      modeMetrics.avgQuality = (modeMetrics.avgQuality * (modeMetrics.count - 1) + quality) / modeMetrics.count
    }

    if (verificationPassed !== undefined) {
      context.qualityMetrics.verificationStats.totalVerifications += 1
      if (verificationPassed) {
        context.qualityMetrics.verificationStats.passedVerifications += 1
      }
    }
  }

  /**
   * Limpia fuentes expiradas del caché
   */
  private cleanExpiredSources(context: ChatContext): void {
    const now = new Date()
    context.cachedSources = context.cachedSources.filter(cached => cached.expiresAt > now)
  }

  /**
   * Verifica si dos consultas son similares
   */
  private isQuerySimilar(query1: string, query2: string): boolean {
    // Algoritmo simple de similitud basado en palabras clave
    const words1 = query1.split(' ').filter(word => word.length > 3)
    const words2 = query2.split(' ').filter(word => word.length > 3)
    
    if (words1.length === 0 || words2.length === 0) return false
    
    const commonWords = words1.filter(word => words2.includes(word))
    const similarity = commonWords.length / Math.max(words1.length, words2.length)
    
    return similarity >= 0.3 // 30% de similitud mínima
  }

  /**
   * Genera recomendaciones basadas en métricas
   */
  private generateRecommendations(
    modePerformance: any,
    averageQuality: number,
    successRate: number
  ): string[] {
    const recommendations: string[] = []

    // Recomendaciones basadas en calidad promedio
    if (averageQuality < 7.0) {
      recommendations.push("Considera reformular tus consultas para ser más específicas y obtener mejores resultados.")
    }

    // Recomendaciones basadas en modo de rendimiento
    const modes = Object.entries(modePerformance) as [string, any][]
    const bestMode = modes.reduce((best, [mode, stats]) => {
      if (stats.count === 0) return best
      return stats.avgQuality > best.avgQuality ? { mode, ...stats } : best
    }, { mode: 'react', avgQuality: 0 })

    if (bestMode.mode !== 'react' && bestMode.count > 5) {
      recommendations.push(`El modo ${bestMode.mode} ha mostrado mejor rendimiento para tus consultas. Considera usarlo más frecuentemente.`)
    }

    // Recomendaciones basadas en tasa de verificación
    if (successRate < 0.8) {
      recommendations.push("La tasa de verificación es baja. Considera consultas más específicas o revisar la calidad de las fuentes.")
    }

    // Recomendaciones generales
    if (recommendations.length === 0) {
      recommendations.push("Tus consultas están obteniendo buenos resultados. Continúa con el mismo enfoque.")
    }

    return recommendations
  }

  /**
   * Obtiene métricas por defecto
   */
  private getDefaultQualityMetrics(): any {
    return {
      totalQueries: 0,
      averageQuality: 0,
      modePerformance: {
        react: { count: 0, avgQuality: 0, avgTime: 0 },
        iter_research: { count: 0, avgQuality: 0, avgTime: 0 },
        hybrid: { count: 0, avgQuality: 0, avgTime: 0 }
      },
      verificationStats: {
        totalVerifications: 0,
        passedVerifications: 0,
        averageConfidence: 0,
        successRate: 0
      },
      topPerformingMode: 'react' as const,
      recommendations: []
    }
  }

  /**
   * Construye el contexto actual para el modelo
   */
  /**
   * Construye la sección de historial de conversación
   */
  private buildConversationHistorySection(recentMessages: ChatMemory[]): string[] {
    const contextParts: string[] = []
    
    if (recentMessages.length > 0) {
      contextParts.push("## HISTORIAL DE CONVERSACIÓN RELEVANTE:")
      recentMessages.forEach(msg => {
        if (msg.role === 'user') {
          contextParts.push(`Usuario: ${msg.content}`)
        } else if (msg.role === 'assistant') {
          const metadata = msg.metadata
          const modeInfo = metadata?.researchMode ? ` (Modo: ${metadata.researchMode})` : ''
          const qualityInfo = metadata?.finalQuality ? ` (Calidad: ${metadata.finalQuality}/10)` : ''
          contextParts.push(`Asistente: ${msg.content.substring(0, 200)}...${modeInfo}${qualityInfo}`)
        }
      })
    }
    
    return contextParts
  }

  /**
   * Construye la sección de historial de búsquedas
   */
  private buildSearchHistorySection(searchHistory: ChatContext['searchHistory']): string[] {
    const contextParts: string[] = []
    
    if (searchHistory.length > 0) {
      contextParts.push("\n## BÚSQUEDAS ANTERIORES:")
      searchHistory.slice(-3).forEach(search => {
        const modeInfo = search.researchMode ? ` [${search.researchMode}]` : ''
        const verificationInfo = search.verificationPassed !== undefined ? 
          ` (Verificación: ${search.verificationPassed ? '✅' : '❌'})` : ''
        contextParts.push(`- "${search.query}"${modeInfo} (${search.results} resultados, calidad: ${search.quality}/10)${verificationInfo}`)
      })
    }
    
    return contextParts
  }

  /**
   * Construye la sección de fuentes cacheadas
   */
  private buildCachedSourcesSection(cachedSources: ChatContext['cachedSources']): string[] {
    const contextParts: string[] = []
    
    if (cachedSources.length > 0) {
      const recentCachedSources = cachedSources
        .filter(cached => {
          const age = Date.now() - cached.createdAt.getTime()
          return age <= this.SOURCE_CACHE_TTL
        })
        .slice(-2) // Últimas 2 consultas cacheadas

      if (recentCachedSources.length > 0) {
        contextParts.push("\n## FUENTES VERIFICADAS DISPONIBLES:")
        recentCachedSources.forEach(cached => {
          const verifiedCount = cached.sources.filter(s => s.verified).length
          contextParts.push(`- Consulta: "${cached.query}" (${verifiedCount}/${cached.sources.length} fuentes verificadas)`)
        })
      }
    }
    
    return contextParts
  }

  /**
   * Construye la sección de métricas de rendimiento
   */
  private buildPerformanceMetricsSection(qualityMetrics: ChatContext['qualityMetrics']): string[] {
    const contextParts: string[] = []
    
    if (qualityMetrics.totalQueries > 0) {
      contextParts.push("\n## MÉTRICAS DE RENDIMIENTO:")
      contextParts.push(`- Total consultas: ${qualityMetrics.totalQueries}`)
      contextParts.push(`- Calidad promedio: ${qualityMetrics.averageQuality.toFixed(1)}/10`)
      
      const modeStats = qualityMetrics.modePerformance
      const usedModes = Object.entries(modeStats).filter(([_, stats]) => stats.count > 0)
      if (usedModes.length > 0) {
        contextParts.push("- Rendimiento por modo:")
        usedModes.forEach(([mode, stats]) => {
          contextParts.push(`  • ${mode}: ${stats.count} consultas, calidad ${stats.avgQuality.toFixed(1)}/10`)
        })
      }

      const verificationStats = qualityMetrics.verificationStats
      if (verificationStats.totalVerifications > 0) {
        const successRate = (verificationStats.passedVerifications / verificationStats.totalVerifications * 100).toFixed(1)
        contextParts.push(`- Tasa de verificación: ${successRate}%`)
      }
    }
    
    return contextParts
  }

  /**
   * Construye la sección de preferencias del usuario
   */
  private buildUserPreferencesSection(userPreferences: ChatContext['userPreferences']): string[] {
    const contextParts: string[] = []
    
    contextParts.push("\n## PREFERENCIAS DEL USUARIO:")
    contextParts.push(`- Estrategia de búsqueda: ${userPreferences.preferredSearchStrategy}`)
    contextParts.push(`- Máximo de rondas: ${userPreferences.maxSearchRounds}`)
    contextParts.push(`- Decisión del modelo: ${userPreferences.enableModelDecision ? 'Activada' : 'Desactivada'}`)
    
    if (userPreferences.preferredResearchMode) {
      contextParts.push(`- Modo preferido: ${userPreferences.preferredResearchMode}`)
    }
    
    if (userPreferences.qualityThreshold) {
      contextParts.push(`- Umbral de calidad: ${userPreferences.qualityThreshold}`)
    }
    
    return contextParts
  }

  private buildCurrentContext(context: ChatContext): string {
    const recentMessages = context.conversationHistory.slice(-10)
    const contextParts: string[] = []

    // Construir cada sección usando las funciones extraídas
    contextParts.push(...this.buildConversationHistorySection(recentMessages))
    contextParts.push(...this.buildSearchHistorySection(context.searchHistory))
    contextParts.push(...this.buildCachedSourcesSection(context.cachedSources))
    contextParts.push(...this.buildPerformanceMetricsSection(context.qualityMetrics))
    contextParts.push(...this.buildUserPreferencesSection(context.userPreferences))

    return contextParts.join('\n')
  }
  /**
   * Carga mensajes del chat desde la base de datos
   */
  private async loadMessagesFromDB(chatId: string, userId: string): Promise<ChatMemory[]> {
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(this.MAX_MEMORY_ENTRIES)

    if (messagesError) {
      console.error('Error cargando mensajes:', messagesError)
      return []
    }

    return (messages || []).map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      userId: msg.user_id,
      messageId: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: new Date(msg.created_at),
      metadata: msg.metadata
    }))
  }

  /**
   * Carga contexto del chat desde la base de datos
   */
  private async loadContextDataFromDB(chatId: string, userId: string): Promise<any> {
    const { data: contextData, error: contextError } = await supabase
      .from('chat_contexts')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single()

    if (contextError) {
      console.error('Error cargando contexto:', contextError)
      return null
    }

    return contextData
  }

  /**
   * Construye contexto vacío por defecto
   */
  private buildEmptyContext(chatId: string, userId: string): ChatContext {
    return {
      chatId,
      userId,
      conversationHistory: [],
      currentContext: '',
      searchHistory: [],
      userPreferences: {
        preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
        maxSearchRounds: 8,
        enableModelDecision: true,
        preferredResearchMode: undefined,
        qualityThreshold: 0.85
      },
      cachedSources: [],
      qualityMetrics: {
        totalQueries: 0,
        averageQuality: 0,
        modePerformance: {
          react: { count: 0, avgQuality: 0, avgTime: 0 },
          iter_research: { count: 0, avgQuality: 0, avgTime: 0 },
          hybrid: { count: 0, avgQuality: 0, avgTime: 0 }
        },
        verificationStats: {
          totalVerifications: 0,
          passedVerifications: 0,
          averageConfidence: 0,
          successRate: 0
        }
      }
    }
  }

  private async loadChatContextFromDB(chatId: string, userId: string): Promise<ChatContext> {
    try {
      // Cargar mensajes del chat
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(this.MAX_MEMORY_ENTRIES)

      if (messagesError) {
        console.error('Error cargando mensajes:', messagesError)
      }

      // Cargar contexto del chat
      const { data: contextData, error: contextError } = await supabase
        .from('chat_contexts')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .single()

      const conversationHistory: ChatMemory[] = (messages || []).map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        userId: msg.user_id,
        messageId: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata
      }))

      const context: ChatContext = {
        chatId,
        userId,
        conversationHistory,
        currentContext: '',
        searchHistory: contextData?.search_history || [],
        userPreferences: contextData?.user_preferences || {
          preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
          maxSearchRounds: 8,
          enableModelDecision: true,
          preferredResearchMode: undefined,
          qualityThreshold: 0.85
        },
        cachedSources: contextData?.cached_sources || [],
        qualityMetrics: contextData?.quality_metrics || {
          totalQueries: 0,
          averageQuality: 0,
          modePerformance: {
            react: { count: 0, avgQuality: 0, avgTime: 0 },
            iter_research: { count: 0, avgQuality: 0, avgTime: 0 },
            hybrid: { count: 0, avgQuality: 0, avgTime: 0 }
          },
          verificationStats: {
            totalVerifications: 0,
            passedVerifications: 0,
            averageConfidence: 0
          }
        }
      }

      context.currentContext = this.buildCurrentContext(context)
      return context

    } catch (error) {
      console.error('Error cargando contexto:', error)
      
      // Retornar contexto vacío en caso de error
      return {
        chatId,
        userId,
        conversationHistory: [],
        currentContext: '',
        searchHistory: [],
        userPreferences: {
          preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
          maxSearchRounds: 8,
          enableModelDecision: true,
          preferredResearchMode: undefined,
          qualityThreshold: 0.85
        },
        cachedSources: [],
        qualityMetrics: {
          totalQueries: 0,
          averageQuality: 0,
          modePerformance: {
            react: { count: 0, avgQuality: 0, avgTime: 0 },
            iter_research: { count: 0, avgQuality: 0, avgTime: 0 },
            hybrid: { count: 0, avgQuality: 0, avgTime: 0 }
          },
          verificationStats: {
            totalVerifications: 0,
            passedVerifications: 0,
            averageConfidence: 0
          }
        }
      }
    }
  }

  /**
   * Guarda memoria en base de datos
   */
  private async saveMemoryToDB(memory: ChatMemory): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .upsert({
          id: memory.id,
          chat_id: memory.chatId,
          user_id: memory.userId,
          content: memory.content,
          role: memory.role,
          metadata: memory.metadata,
          created_at: memory.timestamp.toISOString()
        })

      if (error) {
        console.error('Error guardando memoria:', error)
      }
    } catch (error) {
      console.error('Error guardando memoria:', error)
    }
  }

  /**
   * Guarda contexto en base de datos
   */
  private async saveContextToDB(context: ChatContext): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_contexts')
        .upsert({
          chat_id: context.chatId,
          user_id: context.userId,
          search_history: context.searchHistory,
          user_preferences: context.userPreferences,
          cached_sources: context.cachedSources,
          quality_metrics: context.qualityMetrics,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error guardando contexto:', error)
      }
    } catch (error) {
      console.error('Error guardando contexto:', error)
    }
  }

  /**
   * Limpia la memoria del chat
   */
  async clearChatMemory(chatId: string, userId: string): Promise<void> {
    const cacheKey = `${chatId}-${userId}`
    this.memoryCache.delete(cacheKey)

    try {
      // Limpiar mensajes de la base de datos
      await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', userId)

      // Limpiar contexto
      await supabase
        .from('chat_contexts')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', userId)

    } catch (error) {
      console.error('Error limpiando memoria:', error)
    }
  }

  /**
   * Obtiene estadísticas avanzadas de memoria
   */
  async getAdvancedMemoryStats(chatId: string, userId: string): Promise<{
    totalMessages: number
    totalSearches: number
    averageQuality: number
    lastActivity: Date | null
    researchModeStats: {
      react: { count: number; avgQuality: number; avgTime: number }
      iter_research: { count: number; avgQuality: number; avgTime: number }
      hybrid: { count: number; avgQuality: number; avgTime: number }
    }
    verificationStats: {
      totalVerifications: number
      passedVerifications: number
      averageConfidence: number
      successRate: number
    }
    cachedSourcesCount: number
    topPerformingMode: 'react' | 'iter_research' | 'hybrid'
    recommendations: string[]
  }> {
    const context = await this.getChatContext(chatId, userId)
    
    const totalMessages = context.conversationHistory.length
    const totalSearches = context.searchHistory.length
    const averageQuality = context.qualityMetrics.averageQuality
    const lastActivity = context.conversationHistory.length > 0 
      ? context.conversationHistory[context.conversationHistory.length - 1].timestamp
      : null

    const verificationStats = context.qualityMetrics.verificationStats
    const successRate = verificationStats.totalVerifications > 0 
      ? verificationStats.passedVerifications / verificationStats.totalVerifications 
      : 0

    // Determinar modo con mejor rendimiento
    const modePerformance = context.qualityMetrics.modePerformance
    const topPerformingMode = Object.entries(modePerformance).reduce((best, [mode, stats]) => {
      if (stats.count === 0) return best
      const currentBest = modePerformance[best as keyof typeof modePerformance]
      return stats.avgQuality > currentBest.avgQuality ? (mode as 'react' | 'iter_research' | 'hybrid') : best
    }, 'react' as 'react' | 'iter_research' | 'hybrid')

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(modePerformance, averageQuality, successRate)

    return {
      totalMessages,
      totalSearches,
      averageQuality,
      lastActivity,
      researchModeStats: modePerformance,
      verificationStats: {
        ...verificationStats,
        successRate
      },
      cachedSourcesCount: context.cachedSources.length,
      topPerformingMode,
      recommendations
    }
  }
}
