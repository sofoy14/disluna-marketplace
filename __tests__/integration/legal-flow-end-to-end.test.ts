/**
 * Test End-to-End - Flujo Legal Completo
 * 
 * Test de integración que verifica el flujo completo del asistente legal,
 * desde la consulta del usuario hasta la respuesta verificada.
 */

import { TongyiUnifiedLegalAgent } from '../../lib/agents/tongyi-unified-legal-agent'
import { ChatMemoryManager } from '../../lib/memory/chat-memory-manager'
import { AntiHallucinationSystem } from '../../lib/anti-hallucination/anti-hallucination-system'
import { ContinuousVerificationSystem } from '../../lib/verification/continuous-verification-system'
import OpenAI from 'openai'

// Mocks globales
const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
}

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

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIClient)
})

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('Flujo Legal Completo - Test End-to-End', () => {
  let legalAgent: TongyiUnifiedLegalAgent
  let memoryManager: ChatMemoryManager
  let antiHallucinationSystem: AntiHallucinationSystem
  let verificationSystem: ContinuousVerificationSystem
  const mockClient = new OpenAI({ apiKey: 'test-key' })

  beforeEach(() => {
    legalAgent = new TongyiUnifiedLegalAgent()
    memoryManager = new ChatMemoryManager()
    antiHallucinationSystem = new AntiHallucinationSystem(mockClient, 'gpt-4')
    verificationSystem = new ContinuousVerificationSystem(mockClient, 'gpt-4')
    jest.clearAllMocks()
  })

  describe('Flujo Completo - Consulta Simple', () => {
    test('debe procesar consulta legal simple end-to-end', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS en Colombia?'
      const userId = 'test-user-123'
      const chatId = 'test-chat-456'

      // Mock de verificación pre-búsqueda
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.95,
              legalRelevance: 0.9,
              complexity: 'medium',
              recommendedSearchStrategy: 'iter_research',
              potentialIssues: [],
              suggestions: [
                'Buscar información sobre Código de Comercio',
                'Consultar normativa de DIAN',
                'Verificar requisitos de capital mínimo'
              ]
            })
          }
        }]
      })

      // Mock de búsqueda legal (simulado)
      const mockSearchResults = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/1689347',
          snippet: 'Para constituir una sociedad por acciones simplificada se requiere un capital mínimo de $1,000,000...',
          type: 'official' as const,
          quality: 9,
          authority: 'maxima' as const
        },
        {
          title: 'DIAN - Requisitos Tributarios SAS',
          url: 'https://www.dian.gov.co/requisitos-sas',
          snippet: 'Requisitos tributarios para constitución de SAS...',
          type: 'official' as const,
          quality: 8,
          authority: 'maxima' as const
        }
      ]

      // Mock de verificación durante búsqueda
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.9,
              qualityScore: 0.85,
              sourceEvaluation: {
                official: {
                  count: 2,
                  averageQuality: 8.5,
                  relevance: 0.9
                }
              },
              recommendations: [
                'Fuentes oficiales de alta calidad encontradas',
                'Información suficiente para responder'
              ],
              issues: []
            })
          }
        }]
      })

      // Mock de verificación post-búsqueda
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isSufficient: true,
              confidence: 0.9,
              completenessScore: 0.85,
              qualityScore: 0.9,
              coverage: {
                legal: 0.9,
                procedural: 0.8,
                practical: 0.7
              },
              missingInfo: [],
              recommendations: [
                'Información suficiente para responder',
                'Fuentes oficiales de alta calidad'
              ]
            })
          }
        }]
      })

      // Mock de generación de respuesta
      const mockResponse = 'Para constituir una SAS en Colombia se requiere: 1) Capital mínimo de $1,000,000 según el Artículo 110 del Código de Comercio, 2) Mínimo 1 socio, 3) Documentos constitutivos, 4) Registro en Cámara de Comercio, 5) Inscripción en DIAN para efectos tributarios.'

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: mockResponse
          }
        }]
      })

      // Mock de verificación pre-síntesis
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.95,
              accuracyScore: 0.9,
              completenessScore: 0.85,
              sourceAlignment: 0.95,
              issues: [],
              recommendations: [
                'Respuesta bien fundamentada',
                'Información precisa y completa'
              ]
            })
          }
        }]
      })

      // Mock de verificación post-síntesis
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.95,
              finalScore: 0.9,
              qualityMetrics: {
                accuracy: 0.95,
                completeness: 0.9,
                clarity: 0.85,
                legalCompliance: 0.95
              },
              verificationChecks: {
                sourceAlignment: true,
                legalAccuracy: true,
                completeness: true,
                clarity: true
              },
              recommendations: [
                'Respuesta de alta calidad',
                'Bien fundamentada en fuentes oficiales'
              ],
              warnings: []
            })
          }
        }]
      })

      // Mock de verificación anti-alucinación
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: true,
              confidence: 0.95,
              supportedClaims: [
                'Capital mínimo de $1,000,000 está respaldado por Artículo 110',
                'Requisitos de documentos están en Código de Comercio',
                'Registro en Cámara de Comercio es obligatorio'
              ],
              unsupportedClaims: [],
              sourceValidation: {
                articulo110: {
                  found: true,
                  relevance: 0.95,
                  accuracy: 0.95
                }
              },
              recommendations: ['La información está bien respaldada por fuentes oficiales']
            })
          }
        }]
      })

      // Ejecutar flujo completo
      const result = await legalAgent.processLegalQuery({
        query: userQuery,
        userId,
        chatId,
        context: {
          conversationHistory: [],
          userPreferences: {
            preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
            maxSearchRounds: 5,
            enableModelDecision: true
          }
        }
      })

      // Verificaciones del resultado
      expect(result.success).toBe(true)
      expect(result.response).toContain('Capital mínimo de $1,000,000')
      expect(result.response).toContain('Artículo 110 del Código de Comercio')
      expect(result.sources).toHaveLength(2)
      expect(result.sources[0].type).toBe('official')
      expect(result.sources[0].authority).toBe('maxima')
      expect(result.quality).toBeGreaterThan(0.8)
      expect(result.verification.passed).toBe(true)
      expect(result.verification.confidence).toBeGreaterThan(0.9)

      // Verificar que se registró en memoria
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_contexts')
    })
  })

  describe('Flujo Completo - Consulta Compleja', () => {
    test('debe procesar consulta legal compleja con múltiples rondas de investigación', async () => {
      const userQuery = '¿Cómo estructurar una fusión entre una SAS colombiana y una LLC estadounidense considerando tratados de doble tributación?'
      const userId = 'test-user-complex'
      const chatId = 'test-chat-complex'

      // Mock de verificación pre-búsqueda (consulta compleja)
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.9,
              legalRelevance: 0.95,
              complexity: 'high',
              recommendedSearchStrategy: 'iter_research',
              potentialIssues: [
                'Consulta muy compleja',
                'Requiere múltiples áreas de derecho',
                'Necesita fuentes especializadas'
              ],
              suggestions: [
                'Buscar normativa de fusiones internacionales',
                'Consultar tratados de doble tributación',
                'Verificar regulaciones de inversión extranjera',
                'Considerar consulta legal profesional'
              ]
            })
          }
        }]
      })

      // Mock de primera ronda de búsqueda
      const mockSearchResults1 = [
        {
          title: 'Ley 1607 de 2012 - Reforma Tributaria',
          url: 'https://www.suin-juriscol.gov.co',
          snippet: 'Normativa sobre fusiones internacionales...',
          type: 'official' as const,
          quality: 8,
          authority: 'maxima' as const
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.7,
              qualityScore: 0.6,
              sourceEvaluation: {
                official: {
                  count: 1,
                  averageQuality: 8,
                  relevance: 0.7
                }
              },
              recommendations: [
                'Buscar más información sobre tratados de doble tributación',
                'Consultar normativa específica de LLC'
              ],
              issues: [
                'Información parcial sobre fusión internacional'
              ]
            })
          }
        }]
      })

      // Mock de segunda ronda de búsqueda
      const mockSearchResults2 = [
        {
          title: 'Tratado de Doble Tributación Colombia-EE.UU.',
          url: 'https://www.dian.gov.co/tratados',
          snippet: 'Convenio para evitar doble tributación...',
          type: 'official' as const,
          quality: 9,
          authority: 'maxima' as const
        },
        {
          title: 'Regulaciones de Inversión Extranjera',
          url: 'https://www.mincomercio.gov.co',
          snippet: 'Normativa sobre inversión extranjera...',
          type: 'official' as const,
          quality: 8,
          authority: 'maxima' as const
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.9,
              qualityScore: 0.85,
              sourceEvaluation: {
                official: {
                  count: 3,
                  averageQuality: 8.3,
                  relevance: 0.9
                }
              },
              recommendations: [
                'Información suficiente encontrada',
                'Fuentes oficiales de alta calidad'
              ],
              issues: []
            })
          }
        }]
      })

      // Mock de verificación post-búsqueda
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isSufficient: true,
              confidence: 0.85,
              completenessScore: 0.8,
              qualityScore: 0.85,
              coverage: {
                legal: 0.85,
                procedural: 0.7,
                practical: 0.6
              },
              missingInfo: [
                'Procedimientos específicos de registro'
              ],
              recommendations: [
                'Información suficiente para respuesta general',
                'Se recomienda consulta legal profesional para detalles específicos'
              ]
            })
          }
        }]
      })

      // Mock de generación de respuesta compleja
      const mockComplexResponse = 'Para estructurar una fusión entre una SAS colombiana y una LLC estadounidense: 1) Cumplir con Ley 1607 de 2012 sobre fusiones internacionales, 2) Aplicar Tratado de Doble Tributación Colombia-EE.UU., 3) Cumplir regulaciones de inversión extranjera, 4) Procedimientos de registro en ambas jurisdicciones. NOTA: Este es un proceso complejo que requiere asesoría legal especializada.'

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: mockComplexResponse
          }
        }]
      })

      // Mock de verificación pre-síntesis
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.9,
              accuracyScore: 0.85,
              completenessScore: 0.8,
              sourceAlignment: 0.9,
              issues: [],
              recommendations: [
                'Respuesta apropiada para consulta compleja',
                'Incluye advertencia sobre consulta profesional'
              ]
            })
          }
        }]
      })

      // Mock de verificación post-síntesis
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.9,
              finalScore: 0.85,
              qualityMetrics: {
                accuracy: 0.9,
                completeness: 0.8,
                clarity: 0.85,
                legalCompliance: 0.9
              },
              verificationChecks: {
                sourceAlignment: true,
                legalAccuracy: true,
                completeness: true,
                clarity: true
              },
              recommendations: [
                'Respuesta apropiada para consulta compleja',
                'Bien fundamentada en fuentes oficiales'
              ],
              warnings: [
                'Consulta compleja - se recomienda asesoría profesional'
              ]
            })
          }
        }]
      })

      // Mock de verificación anti-alucinación
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: true,
              confidence: 0.9,
              supportedClaims: [
                'Ley 1607 de 2012 regula fusiones internacionales',
                'Tratado de Doble Tributación existe',
                'Regulaciones de inversión extranjera aplican'
              ],
              unsupportedClaims: [],
              sourceValidation: {
                ley1607: {
                  found: true,
                  relevance: 0.9,
                  accuracy: 0.9
                },
                tratadoDobleTributacion: {
                  found: true,
                  relevance: 0.95,
                  accuracy: 0.95
                }
              },
              recommendations: [
                'Información respaldada por fuentes oficiales',
                'Advertencia sobre consulta profesional es apropiada'
              ]
            })
          }
        }]
      })

      // Ejecutar flujo completo
      const result = await legalAgent.processLegalQuery({
        query: userQuery,
        userId,
        chatId,
        context: {
          conversationHistory: [],
          userPreferences: {
            preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
            maxSearchRounds: 8,
            enableModelDecision: true
          }
        }
      })

      // Verificaciones del resultado
      expect(result.success).toBe(true)
      expect(result.response).toContain('Ley 1607 de 2012')
      expect(result.response).toContain('Tratado de Doble Tributación')
      expect(result.response).toContain('asesoría legal especializada')
      expect(result.sources).toHaveLength(3)
      expect(result.quality).toBeGreaterThan(0.8)
      expect(result.verification.passed).toBe(true)
      expect(result.warnings).toContain('Consulta compleja - se recomienda asesoría profesional')
    })
  })

  describe('Flujo Completo - Manejo de Errores', () => {
    test('debe manejar errores en el flujo completo gracefully', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const userId = 'test-user-error'
      const chatId = 'test-chat-error'

      // Mock de error en verificación pre-búsqueda
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('API timeout')
      )

      // Ejecutar flujo con error
      const result = await legalAgent.processLegalQuery({
        query: userQuery,
        userId,
        chatId,
        context: {
          conversationHistory: [],
          userPreferences: {
            preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
            maxSearchRounds: 5,
            enableModelDecision: true
          }
        }
      })

      // Verificar manejo graceful del error
      expect(result.success).toBe(false)
      expect(result.error).toContain('Error en el procesamiento')
      expect(result.response).toContain('Lo siento, hubo un error')
    })
  })

  describe('Cumplimiento Legal - Trazabilidad Completa', () => {
    test('debe mantener trazabilidad completa para auditoría', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const userId = 'audit-user'
      const chatId = 'audit-chat'

      // Mock completo del flujo
      mockOpenAIClient.chat.completions.create
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, confidence: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, qualityScore: 0.8 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isSufficient: true, confidence: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: 'Respuesta legal completa' } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, confidence: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, finalScore: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isAccurate: true, confidence: 0.9 }) } }] })

      const result = await legalAgent.processLegalQuery({
        query: userQuery,
        userId,
        chatId,
        context: {
          conversationHistory: [],
          userPreferences: {
            preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
            maxSearchRounds: 5,
            enableModelDecision: true
          }
        }
      })

      // Verificar que se registró toda la información para auditoría
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_contexts')
      
      // Verificar que el resultado incluye información de auditoría
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.queryHash).toBeDefined()
      expect(result.responseHash).toBeDefined()
      expect(result.verification).toBeDefined()
      expect(result.sources).toBeDefined()
    })
  })
})


















