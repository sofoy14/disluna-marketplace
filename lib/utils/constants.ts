/**
 * Constantes Compartidas para Utilidades
 * 
 * Este archivo define las constantes utilizadas por las utilidades compartidas.
 */

// Tipos de prompts disponibles
export const PROMPT_TYPES = [
  'system',
  'user',
  'context',
  'legal',
  'search',
  'verification',
  'synthesis',
  'error',
  'success',
  'warning',
  'info',
  'debug',
  'trace',
  'audit',
  'compliance',
  'security',
  'performance',
  'quality',
  'validation',
  'test',
  'development',
  'production',
  'staging',
  'local',
  'remote',
  'client',
  'server',
  'database',
  'cache',
  'session',
  'admin',
  'moderator',
  'guest',
  'authenticated',
  'unauthorized',
  'authorized',
  'unauthorized',
  'valid',
  'invalid'
] as const

// Opciones por defecto para prompts
export const DEFAULT_PROMPT_OPTIONS = {
  type: 'system' as const,
  format: 'text' as const,
  encoding: 'utf8' as const,
  compression: 'none' as const,
  encryption: 'none' as const,
  signing: 'none' as const,
  validation: 'none' as const,
  caching: 'none' as const,
  logging: 'console' as const,
  monitoring: 'basic' as const,
  alerting: 'none' as const,
  rateLimiting: 'none' as const,
  throttling: 'none' as const,
  circuitBreaker: 'none' as const,
  retry: 'none' as const,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  rateLimitThreshold: 100,
  throttleThreshold: 50,
  cacheTTL: 3600,
  cacheMaxSize: 1000,
  logLevel: 'info' as const,
  monitorLevel: 'basic' as const,
  alertLevel: 'medium' as const,
  priority: 'normal' as const,
  category: 'system' as const,
  tags: [],
  labels: {},
  annotations: {},
  metadata: {},
  customFields: {},
  extensions: {},
  plugins: [],
  middleware: [],
  handlers: [],
  processors: [],
  transformers: [],
  validators: [],
  serializers: [],
  deserializers: [],
  encoders: [],
  decoders: [],
  compressors: [],
  decompressors: [],
  encryptors: [],
  decryptors: [],
  signers: [],
  verifiers: [],
  authenticators: [],
  authorizers: [],
  auditors: [],
  loggers: [],
  monitors: [],
  alerters: [],
  notifiers: [],
  reporters: [],
  exporters: [],
  importers: [],
  migrators: [],
  updaters: [],
  cleaners: [],
  optimizers: [],
  analyzers: [],
  profilers: [],
  debuggers: [],
  testers: [],
  formatters: [],
  parsers: [],
  builders: [],
  generators: [],
  creators: [],
  destroyers: [],
  initializers: [],
  finalizers: [],
  constructors: [],
  destructors: [],
  factories: [],
  providers: [],
  consumers: [],
  producers: [],
  publishers: [],
  subscribers: [],
  observers: [],
  listeners: [],
  callbacks: [],
  hooks: [],
  events: [],
  signals: [],
  messages: [],
  commands: [],
  queries: [],
  responses: [],
  requests: [],
  replies: [],
  acknowledgments: [],
  confirmations: [],
  rejections: [],
  errors: [],
  exceptions: [],
  warnings: [],
  notices: [],
  info: [],
  debug: [],
  trace: [],
  audit: [],
  compliance: [],
  security: [],
  performance: [],
  quality: [],
  validation: [],
  test: [],
  development: [],
  production: [],
  staging: [],
  local: [],
  remote: [],
  client: [],
  server: [],
  database: [],
  cache: [],
  session: [],
  admin: [],
  moderator: [],
  guest: [],
  authenticated: [],
  unauthorized: [],
  authorized: [],
  unauthorized: [],
  valid: [],
  invalid: []
}

// Patrones comunes de prompts
export const COMMON_PROMPT_PATTERNS = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...',
  error: 'Error detectado: {error}',
  success: 'Operación exitosa: {result}',
  warning: 'Advertencia: {warning}',
  info: 'Información: {info}',
  debug: 'Debug: {debug}',
  trace: 'Trace: {trace}',
  audit: 'Auditoría: {audit}',
  compliance: 'Cumplimiento: {compliance}',
  security: 'Seguridad: {security}',
  performance: 'Rendimiento: {performance}',
  quality: 'Calidad: {quality}',
  validation: 'Validación: {validation}',
  test: 'Prueba: {test}',
  development: 'Desarrollo: {development}',
  production: 'Producción: {production}',
  staging: 'Staging: {staging}',
  local: 'Local: {local}',
  remote: 'Remoto: {remote}',
  client: 'Cliente: {client}',
  server: 'Servidor: {server}',
  database: 'Base de datos: {database}',
  cache: 'Cache: {cache}',
  session: 'Sesión: {session}',
  admin: 'Administrador: {admin}',
  moderator: 'Moderador: {moderator}',
  guest: 'Invitado: {guest}',
  authenticated: 'Autenticado: {authenticated}',
  unauthorized: 'No autorizado: {unauthorized}',
  authorized: 'Autorizado: {authorized}',
  unauthorized: 'No autorizado: {unauthorized}',
  valid: 'Válido: {valid}',
  invalid: 'Inválido: {invalid}'
}

// Plantillas específicas para prompts legales
export const LEGAL_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado en derecho colombiano...',
  user: 'Consulta legal del usuario: {query}',
  context: 'Contexto legal actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts del sistema
export const SYSTEM_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de usuario
export const USER_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de contexto
export const CONTEXT_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de búsqueda
export const SEARCH_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de verificación
export const VERIFICATION_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de síntesis
export const SYNTHESIS_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de error
export const ERROR_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de éxito
export const SUCCESS_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de advertencia
export const WARNING_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de información
export const INFO_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de debug
export const DEBUG_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de trace
export const TRACE_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de auditoría
export const AUDIT_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de cumplimiento
export const COMPLIANCE_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de seguridad
export const SECURITY_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de rendimiento
export const PERFORMANCE_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de calidad
export const QUALITY_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de validación
export const VALIDATION_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de prueba
export const TEST_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de desarrollo
export const DEVELOPMENT_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de producción
export const PRODUCTION_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de staging
export const STAGING_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts locales
export const LOCAL_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts remotos
export const REMOTE_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de cliente
export const CLIENT_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de servidor
export const SERVER_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de base de datos
export const DATABASE_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de cache
export const CACHE_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de sesión
export const SESSION_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de usuario
export const USER_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de administrador
export const ADMIN_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de moderador
export const MODERATOR_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts de invitado
export const GUEST_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts autenticados
export const AUTHENTICATED_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts no autenticados
export const UNAUTHENTICATED_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts autorizados
export const AUTHORIZED_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts no autorizados
export const UNAUTHORIZED_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts válidos
export const VALID_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

// Plantillas para prompts inválidos
export const INVALID_PROMPT_TEMPLATES = {
  system: 'Eres un asistente legal especializado...',
  user: 'Consulta del usuario: {query}',
  context: 'Contexto actual: {context}',
  legal: 'Análisis legal requerido para: {query}',
  search: 'Búsqueda de información legal: {query}',
  verification: 'Verificación de fuentes legales...',
  synthesis: 'Síntesis de información legal...'
}

