/**
 * Setup Global para Tests de Regresión
 * 
 * Configuración global para todos los tests del sistema legal.
 */

// Configuración de variables de entorno para testing
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.SERPER_API_KEY = 'test-serper-key'
process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key'

// Configuración de console para tests
const originalConsole = console

beforeAll(() => {
  // Suprimir logs durante tests para mantener output limpio
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
})

afterAll(() => {
  // Restaurar console original
  global.console = originalConsole
})

// Configuración de mocks globales
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
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
      upsert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
}))

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
})

// Mock de fetch para requests HTTP
global.fetch = jest.fn()

// Configuración de timers para tests
jest.useFakeTimers()

// Configuración de crypto para tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123')
  }
})

// Configuración de Date para tests consistentes
const mockDate = new Date('2024-01-15T10:00:00Z')
jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

// Configuración de Math.random para tests determinísticos
jest.spyOn(Math, 'random').mockReturnValue(0.5)

// Configuración de setTimeout y setInterval para tests
jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
  fn()
  return 1
})

jest.spyOn(global, 'setInterval').mockImplementation((fn) => {
  fn()
  return 1
})

// Configuración de clearTimeout y clearInterval
jest.spyOn(global, 'clearTimeout').mockImplementation(() => {})
jest.spyOn(global, 'clearInterval').mockImplementation(() => {})

// Configuración de process.env para tests
process.env.TEST_MODE = 'true'
process.env.DISABLE_LOGGING = 'true'

// Configuración de errores no manejados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

// Configuración de cleanup después de cada test
afterEach(() => {
  // Limpiar todos los mocks
  jest.clearAllMocks()
  
  // Limpiar timers
  jest.clearAllTimers()
  
  // Resetear fetch mock
  if (global.fetch) {
    (global.fetch as jest.Mock).mockClear()
  }
})

// Configuración de cleanup global
afterAll(() => {
  // Restaurar timers reales
  jest.useRealTimers()
  
  // Restaurar Date real
  jest.restoreAllMocks()
  
  // Limpiar variables de entorno de test
  delete process.env.TEST_MODE
  delete process.env.DISABLE_LOGGING
})

// Configuración de helpers globales para tests
global.testHelpers = {
  // Helper para crear mock de respuesta de OpenAI
  createMockOpenAIResponse: (content: any) => ({
    choices: [{
      message: {
        content: typeof content === 'string' ? content : JSON.stringify(content)
      }
    }]
  }),
  
  // Helper para crear mock de fuente legal
  createMockLegalSource: (overrides = {}) => ({
    title: 'Fuente Legal Test',
    url: 'https://www.test.gov.co',
    content: 'Contenido de prueba',
    snippet: 'Snippet de prueba',
    type: 'official',
    quality: 8,
    authority: 'maxima',
    currency: 'actualizada',
    recommendedUse: 'cita_principal',
    verificationNotes: 'Verificada en tests',
    ...overrides
  }),
  
  // Helper para crear mock de contexto de chat
  createMockChatContext: (overrides = {}) => ({
    chatId: 'test-chat-123',
    userId: 'test-user-456',
    conversationHistory: [],
    currentContext: '',
    searchHistory: [],
    userPreferences: {
      preferredSearchStrategy: 'AGENTE_UNIFICADO_TONGYI',
      maxSearchRounds: 5,
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
    },
    ...overrides
  }),
  
  // Helper para crear mock de consulta legal
  createMockLegalQuery: (overrides = {}) => ({
    query: '¿Cuáles son los requisitos para constituir una SAS?',
    userId: 'test-user-123',
    chatId: 'test-chat-456',
    context: global.testHelpers.createMockChatContext(),
    ...overrides
  }),
  
  // Helper para esperar con timeout
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper para crear mock de error
  createMockError: (message: string, code?: string) => {
    const error = new Error(message)
    if (code) {
      (error as any).code = code
    }
    return error
  }
}

// Configuración de tipos globales para TypeScript
declare global {
  var testHelpers: {
    createMockOpenAIResponse: (content: any) => any
    createMockLegalSource: (overrides?: any) => any
    createMockChatContext: (overrides?: any) => any
    createMockLegalQuery: (overrides?: any) => any
    waitFor: (ms: number) => Promise<void>
    createMockError: (message: string, code?: string) => Error
  }
}







