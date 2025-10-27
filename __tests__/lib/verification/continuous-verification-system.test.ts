/**
 * Tests de Regresión - ContinuousVerificationSystem
 * 
 * Tests críticos para asegurar que el sistema de verificación continua funciona correctamente
 * después de la refactorización, cumpliendo con requisitos de calidad legal.
 */

import { ContinuousVerificationSystem } from '../../lib/verification/continuous-verification-system'
import OpenAI from 'openai'

// Mock del cliente OpenAI
const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
}

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIClient)
})

describe('ContinuousVerificationSystem - Tests de Regresión', () => {
  let verificationSystem: ContinuousVerificationSystem
  const mockClient = new OpenAI({ apiKey: 'test-key' })

  beforeEach(() => {
    verificationSystem = new ContinuousVerificationSystem(mockClient, 'gpt-4')
    jest.clearAllMocks()
  })

  describe('Verificación Pre-Búsqueda', () => {
    test('debe validar consulta legal antes de búsqueda', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS en Colombia?'
      
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

      const result = await verificationSystem.verifyPreSearch(userQuery)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.legalRelevance).toBeGreaterThan(0.8)
      expect(result.recommendedSearchStrategy).toBe('iter_research')
      expect(result.suggestions).toHaveLength(3)
    })

    test('debe detectar consultas no legales', async () => {
      const userQuery = '¿Cómo cocinar una paella valenciana?'
      
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: false,
              confidence: 0.1,
              legalRelevance: 0.0,
              complexity: 'low',
              recommendedSearchStrategy: 'none',
              potentialIssues: [
                'Consulta no relacionada con derecho',
                'Fuera del ámbito legal colombiano'
              ],
              suggestions: [
                'Esta consulta no requiere búsqueda legal',
                'Considere usar un asistente culinario'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyPreSearch(userQuery)

      expect(result.isValid).toBe(false)
      expect(result.legalRelevance).toBe(0)
      expect(result.recommendedSearchStrategy).toBe('none')
      expect(result.potentialIssues).toContain('Consulta no relacionada con derecho')
    })

    test('debe detectar consultas legales complejas', async () => {
      const userQuery = '¿Cómo estructurar una fusión entre una SAS colombiana y una LLC estadounidense considerando tratados de doble tributación y regulaciones de inversión extranjera?'
      
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

      const result = await verificationSystem.verifyPreSearch(userQuery)

      expect(result.isValid).toBe(true)
      expect(result.complexity).toBe('high')
      expect(result.potentialIssues).toContain('Consulta muy compleja')
      expect(result.suggestions).toContain('Considerar consulta legal profesional')
    })
  })

  describe('Verificación Durante Búsqueda', () => {
    test('debe validar fuentes encontradas durante búsqueda', async () => {
      const searchQuery = 'constitución SAS Colombia'
      const searchResults = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/1689347',
          snippet: 'Para constituir una sociedad por acciones simplificada...',
          type: 'official' as const,
          quality: 9
        },
        {
          title: 'Guía de Constitución de Empresas',
          url: 'https://www.example-blog.com',
          snippet: 'Información general sobre empresas...',
          type: 'general' as const,
          quality: 3
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.8,
              qualityScore: 0.85,
              sourceEvaluation: {
                official: {
                  count: 1,
                  averageQuality: 9,
                  relevance: 0.95
                },
                general: {
                  count: 1,
                  averageQuality: 3,
                  relevance: 0.4
                }
              },
              recommendations: [
                'Priorizar fuentes oficiales',
                'Descartar fuentes de baja calidad',
                'Buscar más fuentes oficiales si es necesario'
              ],
              issues: [
                'Una fuente de baja calidad encontrada'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyDuringSearch(searchQuery, searchResults)

      expect(result.isValid).toBe(true)
      expect(result.qualityScore).toBeGreaterThan(0.8)
      expect(result.sourceEvaluation.official.count).toBe(1)
      expect(result.sourceEvaluation.official.averageQuality).toBe(9)
      expect(result.issues).toContain('Una fuente de baja calidad encontrada')
    })

    test('debe detectar fuentes insuficientes', async () => {
      const searchQuery = 'normativa tributaria empresas extranjeras'
      const searchResults = [
        {
          title: 'Información General',
          url: 'https://www.example.com',
          snippet: 'Información básica...',
          type: 'general' as const,
          quality: 2
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: false,
              confidence: 0.3,
              qualityScore: 0.2,
              sourceEvaluation: {
                general: {
                  count: 1,
                  averageQuality: 2,
                  relevance: 0.3
                }
              },
              recommendations: [
                'Buscar fuentes oficiales de DIAN',
                'Consultar normativa específica',
                'Considerar fuentes académicas especializadas'
              ],
              issues: [
                'Fuentes insuficientes',
                'Calidad muy baja',
                'Falta de fuentes oficiales'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyDuringSearch(searchQuery, searchResults)

      expect(result.isValid).toBe(false)
      expect(result.qualityScore).toBeLessThan(0.5)
      expect(result.issues).toContain('Fuentes insuficientes')
      expect(result.recommendations).toContain('Buscar fuentes oficiales de DIAN')
    })
  })

  describe('Verificación Post-Búsqueda', () => {
    test('debe evaluar suficiencia de información encontrada', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere...',
          type: 'official' as const,
          quality: 9,
          authority: 'maxima' as const
        },
        {
          title: 'DIAN - Requisitos Tributarios',
          url: 'https://www.dian.gov.co',
          content: 'Requisitos tributarios para SAS...',
          type: 'official' as const,
          quality: 8,
          authority: 'maxima' as const
        }
      ]

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

      const result = await verificationSystem.verifyPostSearch(userQuery, sources)

      expect(result.isSufficient).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.completenessScore).toBeGreaterThan(0.8)
      expect(result.qualityScore).toBeGreaterThan(0.8)
      expect(result.missingInfo).toHaveLength(0)
    })

    test('debe detectar información insuficiente', async () => {
      const userQuery = '¿Cómo estructurar una fusión internacional compleja?'
      const sources = [
        {
          title: 'Información Básica sobre Fusiones',
          url: 'https://www.example.com',
          content: 'Información general sobre fusiones...',
          type: 'general' as const,
          quality: 4,
          authority: 'baja' as const
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isSufficient: false,
              confidence: 0.3,
              completenessScore: 0.3,
              qualityScore: 0.4,
              coverage: {
                legal: 0.2,
                procedural: 0.1,
                practical: 0.3
              },
              missingInfo: [
                'Normativa específica de fusiones internacionales',
                'Tratados de doble tributación',
                'Regulaciones de inversión extranjera',
                'Procedimientos específicos'
              ],
              recommendations: [
                'Buscar normativa específica',
                'Consultar fuentes oficiales especializadas',
                'Considerar consulta legal profesional'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyPostSearch(userQuery, sources)

      expect(result.isSufficient).toBe(false)
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.missingInfo).toHaveLength(4)
      expect(result.recommendations).toContain('Considerar consulta legal profesional')
    })
  })

  describe('Verificación Pre-Síntesis', () => {
    test('debe validar información antes de generar respuesta', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere un capital mínimo de $1,000,000...',
          type: 'official' as const,
          quality: 9,
          authority: 'maxima' as const
        }
      ]
      const draftResponse = 'Para constituir una SAS en Colombia se requiere un capital mínimo de $1,000,000 según el Artículo 110 del Código de Comercio...'

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

      const result = await verificationSystem.verifyPreSynthesis(userQuery, sources, draftResponse)

      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.accuracyScore).toBeGreaterThan(0.8)
      expect(result.sourceAlignment).toBeGreaterThan(0.9)
      expect(result.issues).toHaveLength(0)
    })

    test('debe detectar desalineación entre fuentes y respuesta', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere un capital mínimo de $1,000,000...',
          type: 'official' as const,
          quality: 9,
          authority: 'maxima' as const
        }
      ]
      const draftResponse = 'Para constituir una SAS se requiere un capital mínimo de $5,000,000...'

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: false,
              confidence: 0.2,
              accuracyScore: 0.3,
              completenessScore: 0.7,
              sourceAlignment: 0.2,
              issues: [
                'Capital mínimo incorrecto en respuesta',
                'Desalineación con fuente oficial'
              ],
              recommendations: [
                'Corregir capital mínimo a $1,000,000',
                'Verificar información con fuentes oficiales'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyPreSynthesis(userQuery, sources, draftResponse)

      expect(result.isValid).toBe(false)
      expect(result.sourceAlignment).toBeLessThan(0.5)
      expect(result.issues).toContain('Capital mínimo incorrecto en respuesta')
    })
  })

  describe('Verificación Post-Síntesis', () => {
    test('debe validar respuesta final generada', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere...',
          type: 'official' as const,
          quality: 9,
          authority: 'maxima' as const
        }
      ]
      const finalResponse = 'Para constituir una SAS en Colombia se requiere: 1) Capital mínimo de $1,000,000, 2) Mínimo 1 socio, 3) Documentos constitutivos según Artículo 110 del Código de Comercio...'

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

      const result = await verificationSystem.verifyPostSynthesis(userQuery, sources, finalResponse)

      expect(result.isValid).toBe(true)
      expect(result.finalScore).toBeGreaterThan(0.8)
      expect(result.qualityMetrics.accuracy).toBeGreaterThan(0.9)
      expect(result.verificationChecks.sourceAlignment).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    test('debe detectar problemas en respuesta final', async () => {
      const userQuery = '¿Cuáles son los requisitos para constituir una SAS?'
      const sources = [
        {
          title: 'Código de Comercio',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Información básica...',
          type: 'official' as const,
          quality: 6,
          authority: 'alta' as const
        }
      ]
      const finalResponse = 'Para constituir una SAS necesitas dinero y documentos.'

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: false,
              confidence: 0.3,
              finalScore: 0.4,
              qualityMetrics: {
                accuracy: 0.6,
                completeness: 0.3,
                clarity: 0.4,
                legalCompliance: 0.5
              },
              verificationChecks: {
                sourceAlignment: false,
                legalAccuracy: false,
                completeness: false,
                clarity: false
              },
              recommendations: [
                'Mejorar nivel de detalle',
                'Incluir información específica',
                'Mejorar claridad de la respuesta'
              ],
              warnings: [
                'Respuesta demasiado general',
                'Falta información específica',
                'No cumple estándares de calidad legal'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyPostSynthesis(userQuery, sources, finalResponse)

      expect(result.isValid).toBe(false)
      expect(result.finalScore).toBeLessThan(0.5)
      expect(result.warnings).toContain('Respuesta demasiado general')
      expect(result.verificationChecks.completeness).toBe(false)
    })
  })

  describe('Evaluación de Jerarquía de Fuentes', () => {
    test('debe priorizar fuentes oficiales correctamente', async () => {
      const sources = [
        {
          title: 'Corte Constitucional - Sentencia T-123',
          url: 'https://www.corteconstitucional.gov.co',
          content: 'Sentencia de la Corte Constitucional...',
          type: 'official' as const,
          quality: 10,
          authority: 'maxima' as const
        },
        {
          title: 'Blog Legal Personal',
          url: 'https://www.blog-legal.com',
          content: 'Opinión personal sobre derecho...',
          type: 'general' as const,
          quality: 2,
          authority: 'minima' as const
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.8,
              qualityScore: 0.85,
              sourceHierarchy: {
                maxima: 1,
                alta: 0,
                media: 0,
                baja: 0,
                minima: 1
              },
              recommendations: [
                'Priorizar fuente de Corte Constitucional',
                'Descartar fuente de blog personal',
                'Buscar más fuentes oficiales'
              ]
            })
          }
        }]
      })

      const result = await verificationSystem.verifyDuringSearch('test query', sources)

      expect(result.sourceHierarchy?.maxima).toBe(1)
      expect(result.sourceHierarchy?.minima).toBe(1)
      expect(result.recommendations).toContain('Priorizar fuente de Corte Constitucional')
    })
  })

  describe('Manejo de Errores', () => {
    test('debe manejar errores de API gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('API timeout')
      )

      const result = await verificationSystem.verifyPreSearch('test query')

      expect(result.isValid).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.error).toContain('API timeout')
    })

    test('debe manejar respuestas malformadas', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Respuesta no válida en JSON'
          }
        }]
      })

      const result = await verificationSystem.verifyPreSearch('test query')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Error parsing verification response')
    })
  })

  describe('Cumplimiento Legal', () => {
    test('debe registrar todas las verificaciones para auditoría', async () => {
      const userQuery = 'Consulta legal'
      
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isValid: true,
              confidence: 0.9,
              legalRelevance: 0.9,
              complexity: 'medium',
              recommendedSearchStrategy: 'iter_research',
              potentialIssues: [],
              suggestions: []
            })
          }
        }]
      })

      const result = await verificationSystem.verifyPreSearch(userQuery)

      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.queryHash).toBeDefined()
    })

    test('debe mantener trazabilidad completa del proceso', async () => {
      const userQuery = 'Consulta legal completa'
      const sources = []
      const response = 'Respuesta legal'

      // Mock para todas las verificaciones
      mockOpenAIClient.chat.completions.create
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, confidence: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, qualityScore: 0.8 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isSufficient: true, confidence: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, confidence: 0.9 }) } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ isValid: true, finalScore: 0.9 }) } }] })

      const preSearch = await verificationSystem.verifyPreSearch(userQuery)
      const duringSearch = await verificationSystem.verifyDuringSearch(userQuery, sources)
      const postSearch = await verificationSystem.verifyPostSearch(userQuery, sources)
      const preSynthesis = await verificationSystem.verifyPreSynthesis(userQuery, sources, response)
      const postSynthesis = await verificationSystem.verifyPostSynthesis(userQuery, sources, response)

      // Verificar que todas las verificaciones tienen timestamps únicos
      expect(preSearch.timestamp).toBeInstanceOf(Date)
      expect(duringSearch.timestamp).toBeInstanceOf(Date)
      expect(postSearch.timestamp).toBeInstanceOf(Date)
      expect(preSynthesis.timestamp).toBeInstanceOf(Date)
      expect(postSynthesis.timestamp).toBeInstanceOf(Date)
    })
  })
})


















