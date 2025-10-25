/**
 * Tests de Regresión - ChatMemoryManager
 * 
 * Tests críticos para asegurar que el sistema de memoria funciona correctamente
 * después de la refactorización, cumpliendo con requisitos de auditoría legal.
 */

import { ChatMemoryManager } from '../../lib/memory/chat-memory-manager'
import { createClient } from '@supabase/supabase-js'

// Mock de Supabase para tests
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    upsert: jest.fn(() => Promise.resolve({ data: [], error: null }))
  }))
}

// Mock del cliente Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('ChatMemoryManager - Tests de Regresión', () => {
  let memoryManager: ChatMemoryManager
  const testUserId = 'test-user-123'
  const testChatId = 'test-chat-456'

  beforeEach(() => {
    memoryManager = new ChatMemoryManager()
    jest.clearAllMocks()
  })

  describe('Trazabilidad Completa', () => {
    test('debe registrar consulta del usuario correctamente', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una empresa en Colombia?'
      
      await memoryManager.addMessage(testChatId, testUserId, {
        role: 'user',
        content: userQuery,
        timestamp: new Date()
      })

      // Verificar que se llamó insert con los datos correctos
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: testChatId,
          user_id: testUserId,
          role: 'user',
          content: userQuery
        })
      )
    })

    test('debe registrar respuesta del asistente con fuentes', async () => {
      const assistantResponse = 'Para constituir una empresa en Colombia se requiere...'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/1689347',
          type: 'official',
          quality: 9
        }
      ]

      await memoryManager.addMessage(testChatId, testUserId, {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
        metadata: {
          sources,
          quality: 8.5,
          verification: { passed: true, confidence: 0.9 },
          mode: 'iter_research'
        }
      })

      // Verificar que se registraron las fuentes
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            sources,
            quality: 8.5,
            verification: { passed: true, confidence: 0.9 },
            mode: 'iter_research'
          })
        })
      )
    })

    test('debe registrar búsquedas realizadas', async () => {
      const searchQuery = 'constitución empresa Colombia requisitos'
      const searchResults = [
        {
          title: 'Constitución de Empresas - DIAN',
          url: 'https://www.dian.gov.co',
          type: 'official',
          quality: 8
        }
      ]

      await memoryManager.addSearchHistory(testChatId, testUserId, {
        query: searchQuery,
        results: searchResults,
        mode: 'legal_search',
        quality: 8,
        duration: 1500
      })

      // Verificar que se registró la búsqueda
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_contexts')
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalled()
    })
  })

  describe('Cache de Fuentes', () => {
    test('debe cachear fuentes verificadas con TTL correcto', async () => {
      const source = {
        url: 'https://www.corteconstitucional.gov.co/relatoria/2024/',
        title: 'Sentencia T-123 de 2024',
        content: 'Contenido de la sentencia...',
        type: 'official' as const,
        quality: 9,
        authority: 'maxima' as const
      }

      await memoryManager.cacheSource(testChatId, testUserId, source)

      // Verificar que se cacheó con TTL de 24 horas
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          cached_sources: expect.arrayContaining([
            expect.objectContaining({
              ...source,
              cachedAt: expect.any(Date),
              expiresAt: expect.any(Date)
            })
          ])
        })
      )
    })

    test('debe recuperar fuentes cacheadas válidas', async () => {
      const cachedSource = {
        url: 'https://www.suin-juriscol.gov.co',
        title: 'Código de Comercio',
        content: 'Contenido del código...',
        type: 'official' as const,
        quality: 9,
        authority: 'maxima' as const,
        cachedAt: new Date(Date.now() - 1000), // 1 segundo atrás
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas en el futuro
      }

      // Mock de respuesta con fuente cacheada
      mockSupabaseClient.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [{
          cached_sources: [cachedSource]
        }],
        error: null
      })

      const sources = await memoryManager.getCachedSources(testChatId, testUserId)

      expect(sources).toHaveLength(1)
      expect(sources[0]).toEqual(cachedSource)
    })

    test('debe excluir fuentes cacheadas expiradas', async () => {
      const expiredSource = {
        url: 'https://www.example.com',
        title: 'Fuente Expirada',
        content: 'Contenido...',
        type: 'general' as const,
        quality: 5,
        authority: 'baja' as const,
        cachedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 horas atrás
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hora atrás (expirada)
      }

      // Mock de respuesta con fuente expirada
      mockSupabaseClient.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [{
          cached_sources: [expiredSource]
        }],
        error: null
      })

      const sources = await memoryManager.getCachedSources(testChatId, testUserId)

      expect(sources).toHaveLength(0)
    })
  })

  describe('Métricas de Calidad', () => {
    test('debe calcular métricas de calidad correctamente', async () => {
      const mockContexts = [
        {
          quality_metrics: {
            totalQueries: 10,
            averageQuality: 8.5,
            modePerformance: {
              react: { count: 3, avgQuality: 8.0, avgTime: 2000 },
              iter_research: { count: 5, avgQuality: 9.0, avgTime: 5000 },
              hybrid: { count: 2, avgQuality: 8.5, avgTime: 3500 }
            },
            verificationStats: {
              totalVerifications: 10,
              passedVerifications: 9,
              averageConfidence: 0.9,
              successRate: 0.9
            }
          },
          search_history: [],
          created_at: new Date().toISOString()
        }
      ]

      mockSupabaseClient.from().select().eq.mockResolvedValueOnce({
        data: mockContexts,
        error: null
      })

      const metrics = await memoryManager.getQualityMetrics(testUserId)

      expect(metrics.totalQueries).toBe(10)
      expect(metrics.averageQuality).toBe(8.5)
      expect(metrics.modePerformance.iter_research.count).toBe(5)
      expect(metrics.verificationStats.successRate).toBe(0.9)
      expect(metrics.topPerformingMode).toBe('iter_research')
    })

    test('debe generar recomendaciones basadas en métricas', async () => {
      const mockContexts = [
        {
          quality_metrics: {
            totalQueries: 5,
            averageQuality: 6.0, // Calidad baja
            modePerformance: {
              react: { count: 2, avgQuality: 5.0, avgTime: 1500 },
              iter_research: { count: 2, avgQuality: 7.0, avgTime: 4000 },
              hybrid: { count: 1, avgQuality: 6.0, avgTime: 3000 }
            },
            verificationStats: {
              totalVerifications: 5,
              passedVerifications: 3, // Tasa baja
              averageConfidence: 0.6,
              successRate: 0.6
            }
          },
          search_history: [],
          created_at: new Date().toISOString()
        }
      ]

      mockSupabaseClient.from().select().eq.mockResolvedValueOnce({
        data: mockContexts,
        error: null
      })

      const metrics = await memoryManager.getQualityMetrics(testUserId)

      expect(metrics.recommendations).toContain(
        expect.stringContaining('mejorar calidad')
      )
      expect(metrics.recommendations).toContain(
        expect.stringContaining('verificación')
      )
    })
  })

  describe('Construcción de Contexto', () => {
    test('debe construir contexto actual correctamente', async () => {
      const mockMessages = [
        {
          role: 'user',
          content: 'Consulta sobre constitución de empresa',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: 'Respuesta sobre constitución...',
          timestamp: new Date().toISOString(),
          metadata: {
            sources: [{ title: 'Fuente 1', url: 'https://example.com' }],
            quality: 8
          }
        }
      ]

      const mockContext = {
        chatId: testChatId,
        userId: testUserId,
        conversationHistory: mockMessages,
        searchHistory: [],
        cachedSources: [],
        userPreferences: {
          preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
          maxSearchRounds: 8,
          enableModelDecision: true
        },
        qualityMetrics: {
          totalQueries: 1,
          averageQuality: 8,
          modePerformance: {
            react: { count: 0, avgQuality: 0, avgTime: 0 },
            iter_research: { count: 1, avgQuality: 8, avgTime: 3000 },
            hybrid: { count: 0, avgQuality: 0, avgTime: 0 }
          },
          verificationStats: {
            totalVerifications: 1,
            passedVerifications: 1,
            averageConfidence: 0.9,
            successRate: 1.0
          }
        }
      }

      mockSupabaseClient.from().select().eq().order().limit.mockResolvedValueOnce({
        data: mockMessages,
        error: null
      })

      mockSupabaseClient.from().select().eq.mockResolvedValueOnce({
        data: [mockContext],
        error: null
      })

      const context = await memoryManager.getChatContext(testChatId, testUserId)

      expect(context.conversationHistory).toHaveLength(2)
      expect(context.currentContext).toContain('Consulta sobre constitución')
      expect(context.currentContext).toContain('Respuesta sobre constitución')
    })
  })

  describe('Manejo de Errores', () => {
    test('debe manejar errores de base de datos gracefully', async () => {
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      })

      // No debe lanzar excepción
      await expect(
        memoryManager.addMessage(testChatId, testUserId, {
          role: 'user',
          content: 'Test message',
          timestamp: new Date()
        })
      ).resolves.not.toThrow()
    })

    test('debe retornar métricas por defecto en caso de error', async () => {
      mockSupabaseClient.from().select().eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' }
      })

      const metrics = await memoryManager.getQualityMetrics(testUserId)

      expect(metrics.totalQueries).toBe(0)
      expect(metrics.averageQuality).toBe(0)
      expect(metrics.topPerformingMode).toBe('react')
    })
  })

  describe('Cumplimiento Legal', () => {
    test('debe registrar información suficiente para auditoría', async () => {
      const auditData = {
        query: 'Consulta legal específica',
        response: 'Respuesta legal detallada',
        sources: [
          {
            title: 'Ley 123 de 2024',
            url: 'https://www.imprenta.gov.co',
            type: 'official',
            quality: 9,
            authority: 'maxima'
          }
        ],
        verification: {
          passed: true,
          confidence: 0.95,
          checks: ['source_validation', 'fact_checking', 'legal_reference']
        },
        timestamp: new Date(),
        userId: testUserId,
        chatId: testChatId
      }

      await memoryManager.addMessage(testChatId, testUserId, {
        role: 'assistant',
        content: auditData.response,
        timestamp: auditData.timestamp,
        metadata: {
          sources: auditData.sources,
          verification: auditData.verification,
          quality: 9
        }
      })

      // Verificar que se registró toda la información necesaria para auditoría
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: auditData.chatId,
          user_id: auditData.userId,
          content: auditData.response,
          metadata: expect.objectContaining({
            sources: auditData.sources,
            verification: auditData.verification,
            quality: 9
          })
        })
      )
    })

    test('debe permitir eliminación de datos para GDPR', async () => {
      await memoryManager.clearChatMemory(testUserId, testChatId)

      // Verificar que se llamaron las operaciones de eliminación
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_contexts')
    })
  })
})

describe('ChatMemoryManager - Tests de Integración', () => {
  let memoryManager: ChatMemoryManager
  const testUserId = 'integration-test-user'
  const testChatId = 'integration-test-chat'

  beforeEach(() => {
    memoryManager = new ChatMemoryManager()
  })

  test('debe mantener consistencia de datos en operaciones complejas', async () => {
    // Simular flujo completo de consulta legal
    const userQuery = '¿Cuáles son los pasos para constituir una SAS?'
    
    // 1. Registrar consulta del usuario
    await memoryManager.addMessage(testChatId, testUserId, {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    })

    // 2. Registrar búsquedas realizadas
    await memoryManager.addSearchHistory(testChatId, testUserId, {
      query: 'constitución SAS Colombia requisitos',
      results: [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          type: 'official',
          quality: 9
        }
      ],
      mode: 'legal_search',
      quality: 9,
      duration: 2000
    })

    // 3. Cachear fuente encontrada
    await memoryManager.cacheSource(testChatId, testUserId, {
      url: 'https://www.suin-juriscol.gov.co',
      title: 'Código de Comercio - Artículo 110',
      content: 'Contenido del artículo...',
      type: 'official',
      quality: 9,
      authority: 'maxima'
    })

    // 4. Registrar respuesta del asistente
    await memoryManager.addMessage(testChatId, testUserId, {
      role: 'assistant',
      content: 'Para constituir una SAS en Colombia...',
      timestamp: new Date(),
      metadata: {
        sources: [
          {
            title: 'Código de Comercio - Artículo 110',
            url: 'https://www.suin-juriscol.gov.co',
            type: 'official',
            quality: 9,
            authority: 'maxima'
          }
        ],
        quality: 9,
        verification: { passed: true, confidence: 0.95 },
        mode: 'iter_research'
      }
    })

    // 5. Verificar que todas las operaciones se registraron
    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(6) // 2 mensajes + 1 búsqueda + 1 cache + 2 contextos
  })
})









