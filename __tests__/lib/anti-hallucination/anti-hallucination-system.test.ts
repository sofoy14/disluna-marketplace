/**
 * Tests de Regresión - AntiHallucinationSystem
 * 
 * Tests críticos para asegurar que el sistema anti-alucinación funciona correctamente
 * después de la refactorización, cumpliendo con requisitos de precisión legal.
 */

import { AntiHallucinationSystem } from '../../lib/anti-hallucination/anti-hallucination-system'
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

describe('AntiHallucinationSystem - Tests de Regresión', () => {
  let antiHallucinationSystem: AntiHallucinationSystem
  const mockClient = new OpenAI({ apiKey: 'test-key' })

  beforeEach(() => {
    antiHallucinationSystem = new AntiHallucinationSystem(mockClient, 'gpt-4')
    jest.clearAllMocks()
  })

  describe('Verificación de Precisión', () => {
    test('debe detectar información respaldada por fuentes', async () => {
      const response = 'Según el Artículo 110 del Código de Comercio, para constituir una SAS se requiere...'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/1689347',
          content: 'Para constituir una sociedad por acciones simplificada se requiere...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: true,
              confidence: 0.95,
              supportedClaims: [
                'Artículo 110 del Código de Comercio menciona constitución de SAS'
              ],
              unsupportedClaims: [],
              sourceValidation: {
                article110: {
                  found: true,
                  relevance: 0.9,
                  accuracy: 0.95
                }
              },
              recommendations: ['La información está bien respaldada por fuentes oficiales']
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.passed).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.supportedClaims).toHaveLength(1)
      expect(result.unsupportedClaims).toHaveLength(0)
    })

    test('debe detectar información no respaldada por fuentes', async () => {
      const response = 'Según el Artículo 999 del Código de Comercio, las SAS pueden tener hasta 1000 socios...'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.2,
              supportedClaims: [],
              unsupportedClaims: [
                'Artículo 999 no existe en el Código de Comercio',
                'Límite de 1000 socios no está respaldado por las fuentes'
              ],
              sourceValidation: {
                article999: {
                  found: false,
                  relevance: 0,
                  accuracy: 0
                }
              },
              recommendations: ['Verificar existencia del artículo mencionado', 'Buscar fuentes oficiales sobre límites de socios']
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.passed).toBe(false)
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.unsupportedClaims).toHaveLength(2)
      expect(result.recommendations).toContain('Verificar existencia del artículo mencionado')
    })

    test('debe detectar información parcialmente respaldada', async () => {
      const response = 'Las SAS requieren un capital mínimo de $1,000,000 y pueden tener hasta 50 socios según el Código de Comercio.'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere un capital mínimo de $1,000,000...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.6,
              supportedClaims: [
                'Capital mínimo de $1,000,000 está respaldado por Artículo 110'
              ],
              unsupportedClaims: [
                'Límite de 50 socios no está especificado en las fuentes'
              ],
              sourceValidation: {
                capitalMinimo: {
                  found: true,
                  relevance: 0.9,
                  accuracy: 0.95
                },
                limiteSocios: {
                  found: false,
                  relevance: 0,
                  accuracy: 0
                }
              },
              recommendations: ['Buscar información específica sobre límites de socios en SAS']
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.passed).toBe(false)
      expect(result.confidence).toBe(0.6)
      expect(result.supportedClaims).toHaveLength(1)
      expect(result.unsupportedClaims).toHaveLength(1)
    })
  })

  describe('Validación de Referencias Legales', () => {
    test('debe validar artículos de ley correctamente', async () => {
      const response = 'Según el Artículo 110 del Código de Comercio...'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes/1689347',
          content: 'Artículo 110. Sociedad por Acciones Simplificada...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: true,
              confidence: 0.95,
              supportedClaims: ['Artículo 110 existe y es relevante'],
              unsupportedClaims: [],
              sourceValidation: {
                article110: {
                  found: true,
                  relevance: 0.95,
                  accuracy: 0.95
                }
              },
              recommendations: []
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.sourceValidation?.article110?.found).toBe(true)
      expect(result.sourceValidation?.article110?.relevance).toBeGreaterThan(0.9)
    })

    test('debe detectar referencias a artículos inexistentes', async () => {
      const response = 'Según el Artículo 9999 del Código de Comercio...'
      const sources = [
        {
          title: 'Código de Comercio',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Contenido del Código de Comercio sin Artículo 9999...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.1,
              supportedClaims: [],
              unsupportedClaims: ['Artículo 9999 no existe en el Código de Comercio'],
              sourceValidation: {
                article9999: {
                  found: false,
                  relevance: 0,
                  accuracy: 0
                }
              },
              recommendations: ['Verificar número de artículo correcto']
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.sourceValidation?.article9999?.found).toBe(false)
      expect(result.unsupportedClaims).toContain('Artículo 9999 no existe en el Código de Comercio')
    })

    test('debe validar sentencias de la Corte Constitucional', async () => {
      const response = 'La Corte Constitucional en la Sentencia T-123 de 2024 estableció que...'
      const sources = [
        {
          title: 'Sentencia T-123 de 2024 - Corte Constitucional',
          url: 'https://www.corteconstitucional.gov.co/relatoria/2024/t-123-24.htm',
          content: 'En la Sentencia T-123 de 2024, la Corte Constitucional estableció...',
          type: 'official' as const,
          quality: 10
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: true,
              confidence: 0.98,
              supportedClaims: ['Sentencia T-123 de 2024 existe y es relevante'],
              unsupportedClaims: [],
              sourceValidation: {
                sentenciaT123: {
                  found: true,
                  relevance: 0.98,
                  accuracy: 0.98
                }
              },
              recommendations: []
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.sourceValidation?.sentenciaT123?.found).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.95)
    })
  })

  describe('Detección de Información Inventada', () => {
    test('debe detectar información completamente inventada', async () => {
      const response = 'Según la Ley 9999 de 2024, todas las empresas deben tener un robot legal obligatorio...'
      const sources = [
        {
          title: 'Código de Comercio',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Contenido del Código de Comercio sin mencionar robots legales...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.05,
              supportedClaims: [],
              unsupportedClaims: [
                'Ley 9999 de 2024 no existe',
                'No hay normativa sobre robots legales obligatorios',
                'La información parece completamente inventada'
              ],
              sourceValidation: {
                ley9999: {
                  found: false,
                  relevance: 0,
                  accuracy: 0
                },
                robotsLegales: {
                  found: false,
                  relevance: 0,
                  accuracy: 0
                }
              },
              recommendations: [
                'Esta información no está respaldada por fuentes oficiales',
                'Se recomienda buscar normativa real sobre obligaciones empresariales'
              ]
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.passed).toBe(false)
      expect(result.confidence).toBeLessThan(0.1)
      expect(result.unsupportedClaims).toHaveLength(3)
      expect(result.recommendations).toContain('Esta información no está respaldada por fuentes oficiales')
    })

    test('debe detectar mezcla de información real e inventada', async () => {
      const response = 'Las SAS requieren un capital mínimo de $1,000,000 y deben tener un unicornio como mascota corporativa.'
      const sources = [
        {
          title: 'Código de Comercio - Artículo 110',
          url: 'https://www.suin-juriscol.gov.co',
          content: 'Para constituir una sociedad por acciones simplificada se requiere un capital mínimo de $1,000,000...',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.4,
              supportedClaims: [
                'Capital mínimo de $1,000,000 está respaldado por Artículo 110'
              ],
              unsupportedClaims: [
                'No hay normativa sobre mascotas corporativas obligatorias',
                'La mención de unicornio parece inventada'
              ],
              sourceValidation: {
                capitalMinimo: {
                  found: true,
                  relevance: 0.9,
                  accuracy: 0.95
                },
                mascotaCorporativa: {
                  found: false,
                  relevance: 0,
                  accuracy: 0
                }
              },
              recommendations: [
                'Separar información verificada de información no respaldada',
                'Eliminar referencias a mascotas corporativas'
              ]
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.passed).toBe(false)
      expect(result.supportedClaims).toHaveLength(1)
      expect(result.unsupportedClaims).toHaveLength(2)
    })
  })

  describe('Generación de Respuestas Conservadoras', () => {
    test('debe generar respuesta conservadora cuando hay dudas', async () => {
      const response = 'Según algunas fuentes, las SAS pueden tener hasta 100 socios, pero esto no está completamente claro...'
      const sources = [
        {
          title: 'Guía de Constitución de Empresas',
          url: 'https://www.example.com',
          content: 'Información general sobre SAS...',
          type: 'general' as const,
          quality: 5
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.3,
              supportedClaims: [],
              unsupportedClaims: [
                'Límite de 100 socios no está claramente establecido',
                'Fuente no oficial y de baja calidad'
              ],
              sourceValidation: {
                limiteSocios: {
                  found: false,
                  relevance: 0.3,
                  accuracy: 0.3
                }
              },
              recommendations: [
                'Buscar fuentes oficiales sobre límites de socios en SAS',
                'Consultar directamente con autoridades competentes',
                'La información actual es insuficiente para dar una respuesta definitiva'
              ]
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.passed).toBe(false)
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.recommendations).toContain('La información actual es insuficiente para dar una respuesta definitiva')
    })

    test('debe recomendar consulta profesional cuando sea necesario', async () => {
      const response = 'Para casos complejos de constitución de SAS con múltiples socios extranjeros...'
      const sources = [
        {
          title: 'Información General sobre SAS',
          url: 'https://www.example.com',
          content: 'Información básica sobre SAS...',
          type: 'general' as const,
          quality: 4
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: false,
              confidence: 0.2,
              supportedClaims: [],
              unsupportedClaims: [
                'Casos complejos requieren análisis específico',
                'Información sobre socios extranjeros no está disponible'
              ],
              sourceValidation: {
                casosComplejos: {
                  found: false,
                  relevance: 0.2,
                  accuracy: 0.2
                }
              },
              recommendations: [
                'Para casos complejos se recomienda consulta legal profesional',
                'Buscar asesoría especializada en derecho societario',
                'La información disponible es insuficiente para este caso específico'
              ]
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      expect(result.recommendations).toContain('Para casos complejos se recomienda consulta legal profesional')
      expect(result.recommendations).toContain('Buscar asesoría especializada en derecho societario')
    })
  })

  describe('Manejo de Errores', () => {
    test('debe manejar errores de API gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      )

      const result = await antiHallucinationSystem.verifyResponse(
        'Test response',
        []
      )

      expect(result.passed).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.error).toContain('API rate limit exceeded')
    })

    test('debe manejar respuestas malformadas del modelo', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Respuesta no válida en JSON'
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(
        'Test response',
        []
      )

      expect(result.passed).toBe(false)
      expect(result.error).toContain('Error parsing verification response')
    })
  })

  describe('Cumplimiento Legal', () => {
    test('debe registrar verificaciones para auditoría', async () => {
      const response = 'Información legal verificada'
      const sources = [
        {
          title: 'Fuente Oficial',
          url: 'https://www.gov.co',
          content: 'Contenido oficial',
          type: 'official' as const,
          quality: 9
        }
      ]

      mockOpenAIClient.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isAccurate: true,
              confidence: 0.95,
              supportedClaims: ['Información respaldada'],
              unsupportedClaims: [],
              sourceValidation: {},
              recommendations: []
            })
          }
        }]
      })

      const result = await antiHallucinationSystem.verifyResponse(response, sources)

      // Verificar que se registró la verificación
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.responseHash).toBeDefined()
      expect(result.sourcesHash).toBeDefined()
    })

    test('debe mantener trazabilidad de verificaciones', async () => {
      const response1 = 'Primera respuesta'
      const response2 = 'Segunda respuesta'
      const sources = []

      mockOpenAIClient.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                isAccurate: true,
                confidence: 0.9,
                supportedClaims: [],
                unsupportedClaims: [],
                sourceValidation: {},
                recommendations: []
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                isAccurate: false,
                confidence: 0.3,
                supportedClaims: [],
                unsupportedClaims: [],
                sourceValidation: {},
                recommendations: []
              })
            }
          }]
        })

      const result1 = await antiHallucinationSystem.verifyResponse(response1, sources)
      const result2 = await antiHallucinationSystem.verifyResponse(response2, sources)

      expect(result1.responseHash).not.toBe(result2.responseHash)
      expect(result1.timestamp).not.toEqual(result2.timestamp)
    })
  })
})









