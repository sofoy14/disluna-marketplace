/**
 * Tipos Compartidos para Utilidades
 * 
 * Este archivo define los tipos TypeScript utilizados por las utilidades compartidas.
 */

// Tipos para síntesis legal
export interface LegalSynthesisOptions {
  client: any // OpenAI client
  model: string
  userQuery: string
  sources: LegalSource[]
  researchRounds?: ResearchRound[]
  synthesisType?: 'comprehensive' | 'brief' | 'detailed'
  includeMetadata?: boolean
  includeWarnings?: boolean
  temperature?: number
  maxTokens?: number
}

export interface LegalSource {
  title: string
  url: string
  content?: string
  snippet?: string
  type?: 'official' | 'academic' | 'news' | 'general'
  quality?: number
  authority?: 'maxima' | 'alta' | 'media' | 'baja' | 'minima'
  currency?: 'actualizada' | 'desactualizada' | 'desconocida'
  recommendedUse?: 'cita_principal' | 'secundaria' | 'contextual' | 'no_usar'
  verificationNotes?: string
}

export interface ResearchRound {
  roundNumber: number
  queries: string[]
  results: LegalSource[]
  durationMs: number
  sufficiencyEvaluation?: {
    isSufficient: boolean
    confidence: number
    totalScore: number
    missingInfo: string[]
    qualityIssues: string[]
  }
}

export interface LegalSynthesisResult {
  success: boolean
  content: string
  metadata?: {
    sourcesUsed: number
    highQualitySources: number
    officialSources: number
    averageQuality: number
    synthesisType: string
    processingTimeMs: number
    warnings?: string[]
    recommendations?: string[]
  }
  error?: string
}

// Tipos para parsing JSON
export interface JSONParseResult<T = any> {
  success: boolean
  data?: T
  error?: string
  warnings?: string[]
}

export interface JSONParseOptions {
  strict?: boolean
  allowComments?: boolean
  allowTrailingCommas?: boolean
  maxDepth?: number
  maxKeys?: number
  maxStringLength?: number
  maxArrayLength?: number
  maxObjectSize?: number
  validateSchema?: boolean
  schema?: any
  customValidators?: Array<(data: any) => boolean | string>
  errorMessages?: {
    invalidJSON?: string
    maxDepthExceeded?: string
    maxKeysExceeded?: string
    maxStringLengthExceeded?: string
    maxArrayLengthExceeded?: string
    maxObjectSizeExceeded?: string
    schemaValidationFailed?: string
    customValidationFailed?: string
  }
}

// Tipos para UUID
export interface UUIDValidationResult {
  isValid: boolean
  version?: number
  variant?: string
  format?: string
  error?: string
}

// Tipos para construcción de prompts
export type PromptType = 
  | 'system'
  | 'user'
  | 'context'
  | 'legal'
  | 'search'
  | 'verification'
  | 'synthesis'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'debug'
  | 'trace'
  | 'audit'
  | 'compliance'
  | 'security'
  | 'performance'
  | 'quality'
  | 'validation'
  | 'test'
  | 'development'
  | 'production'
  | 'staging'
  | 'local'
  | 'remote'
  | 'client'
  | 'server'
  | 'database'
  | 'cache'
  | 'session'
  | 'admin'
  | 'moderator'
  | 'guest'
  | 'authenticated'
  | 'unauthorized'
  | 'authorized'
  | 'unauthorized'
  | 'valid'
  | 'invalid'

export interface PromptOptions {
  type: PromptType
  context?: PromptContext
  variables?: Record<string, any>
  template?: string
  customTemplate?: string
  includeMetadata?: boolean
  includeTimestamp?: boolean
  includeUserInfo?: boolean
  includeSystemInfo?: boolean
  includeEnvironmentInfo?: boolean
  includeVersionInfo?: boolean
  includeBuildInfo?: boolean
  includeDeploymentInfo?: boolean
  includeSecurityInfo?: boolean
  includePerformanceInfo?: boolean
  includeQualityInfo?: boolean
  includeValidationInfo?: boolean
  includeTestInfo?: boolean
  includeDevelopmentInfo?: boolean
  includeProductionInfo?: boolean
  includeStagingInfo?: boolean
  includeLocalInfo?: boolean
  includeRemoteInfo?: boolean
  includeClientInfo?: boolean
  includeServerInfo?: boolean
  includeDatabaseInfo?: boolean
  includeCacheInfo?: boolean
  includeSessionInfo?: boolean
  includeAdminInfo?: boolean
  includeModeratorInfo?: boolean
  includeGuestInfo?: boolean
  includeAuthenticatedInfo?: boolean
  includeUnauthenticatedInfo?: boolean
  includeAuthorizedInfo?: boolean
  includeUnauthorizedInfo?: boolean
  includeValidInfo?: boolean
  includeInvalidInfo?: boolean
  format?: 'text' | 'markdown' | 'html' | 'json' | 'xml' | 'yaml'
  encoding?: 'utf8' | 'utf16' | 'ascii' | 'base64'
  compression?: 'none' | 'gzip' | 'deflate' | 'brotli'
  encryption?: 'none' | 'aes256' | 'rsa2048' | 'chacha20'
  signing?: 'none' | 'hmac-sha256' | 'rsa-sha256' | 'ed25519'
  validation?: 'none' | 'schema' | 'signature' | 'checksum'
  caching?: 'none' | 'memory' | 'redis' | 'database'
  logging?: 'none' | 'console' | 'file' | 'database' | 'remote'
  monitoring?: 'none' | 'basic' | 'detailed' | 'comprehensive'
  alerting?: 'none' | 'email' | 'sms' | 'webhook' | 'slack'
  rateLimiting?: 'none' | 'per-user' | 'per-ip' | 'global'
  throttling?: 'none' | 'per-user' | 'per-ip' | 'global'
  circuitBreaker?: 'none' | 'basic' | 'advanced' | 'custom'
  retry?: 'none' | 'exponential' | 'linear' | 'custom'
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  circuitBreakerThreshold?: number
  circuitBreakerTimeout?: number
  rateLimitThreshold?: number
  throttleThreshold?: number
  cacheTTL?: number
  cacheMaxSize?: number
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  monitorLevel?: 'basic' | 'detailed' | 'comprehensive'
  alertLevel?: 'low' | 'medium' | 'high' | 'critical'
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical'
  category?: 'system' | 'user' | 'admin' | 'security' | 'performance' | 'quality' | 'validation' | 'test' | 'development' | 'production' | 'staging' | 'local' | 'remote' | 'client' | 'server' | 'database' | 'cache' | 'session' | 'moderator' | 'guest' | 'authenticated' | 'unauthorized' | 'authorized' | 'unauthorized' | 'valid' | 'invalid'
  tags?: string[]
  labels?: Record<string, string>
  annotations?: Record<string, string>
  metadata?: Record<string, any>
  customFields?: Record<string, any>
  extensions?: Record<string, any>
  plugins?: string[]
  middleware?: string[]
  handlers?: string[]
  processors?: string[]
  transformers?: string[]
  validators?: string[]
  serializers?: string[]
  deserializers?: string[]
  encoders?: string[]
  decoders?: string[]
  compressors?: string[]
  decompressors?: string[]
  encryptors?: string[]
  decryptors?: string[]
  signers?: string[]
  verifiers?: string[]
  authenticators?: string[]
  authorizers?: string[]
  auditors?: string[]
  loggers?: string[]
  monitors?: string[]
  alerters?: string[]
  notifiers?: string[]
  reporters?: string[]
  exporters?: string[]
  importers?: string[]
  migrators?: string[]
  updaters?: string[]
  cleaners?: string[]
  optimizers?: string[]
  analyzers?: string[]
  profilers?: string[]
  debuggers?: string[]
  testers?: string[]
  validators?: string[]
  formatters?: string[]
  parsers?: string[]
  builders?: string[]
  generators?: string[]
  creators?: string[]
  destroyers?: string[]
  initializers?: string[]
  finalizers?: string[]
  constructors?: string[]
  destructors?: string[]
  factories?: string[]
  providers?: string[]
  consumers?: string[]
  producers?: string[]
  publishers?: string[]
  subscribers?: string[]
  observers?: string[]
  listeners?: string[]
  handlers?: string[]
  callbacks?: string[]
  hooks?: string[]
  events?: string[]
  signals?: string[]
  messages?: string[]
  commands?: string[]
  queries?: string[]
  responses?: string[]
  requests?: string[]
  replies?: string[]
  acknowledgments?: string[]
  confirmations?: string[]
  rejections?: string[]
  errors?: string[]
  exceptions?: string[]
  warnings?: string[]
  notices?: string[]
  info?: string[]
  debug?: string[]
  trace?: string[]
  audit?: string[]
  compliance?: string[]
  security?: string[]
  performance?: string[]
  quality?: string[]
  validation?: string[]
  test?: string[]
  development?: string[]
  production?: string[]
  staging?: string[]
  local?: string[]
  remote?: string[]
  client?: string[]
  server?: string[]
  database?: string[]
  cache?: string[]
  session?: string[]
  admin?: string[]
  moderator?: string[]
  guest?: string[]
  authenticated?: string[]
  unauthorized?: string[]
  authorized?: string[]
  unauthorized?: string[]
  valid?: string[]
  invalid?: string[]
}

export interface PromptContext {
  user?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    preferences?: Record<string, any>
    settings?: Record<string, any>
    profile?: Record<string, any>
    metadata?: Record<string, any>
  }
  session?: {
    id?: string
    startTime?: Date
    endTime?: Date
    duration?: number
    activity?: string[]
    metadata?: Record<string, any>
  }
  system?: {
    version?: string
    build?: string
    environment?: string
    deployment?: string
    configuration?: Record<string, any>
    metadata?: Record<string, any>
  }
  environment?: {
    name?: string
    type?: string
    region?: string
    zone?: string
    cluster?: string
    node?: string
    pod?: string
    container?: string
    service?: string
    namespace?: string
    metadata?: Record<string, any>
  }
  request?: {
    id?: string
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: any
    query?: Record<string, any>
    params?: Record<string, any>
    timestamp?: Date
    duration?: number
    metadata?: Record<string, any>
  }
  response?: {
    id?: string
    status?: number
    headers?: Record<string, string>
    body?: any
    timestamp?: Date
    duration?: number
    metadata?: Record<string, any>
  }
  error?: {
    id?: string
    type?: string
    message?: string
    stack?: string
    code?: string
    details?: any
    timestamp?: Date
    metadata?: Record<string, any>
  }
  performance?: {
    startTime?: Date
    endTime?: Date
    duration?: number
    memoryUsage?: number
    cpuUsage?: number
    networkUsage?: number
    diskUsage?: number
    metadata?: Record<string, any>
  }
  quality?: {
    score?: number
    metrics?: Record<string, number>
    thresholds?: Record<string, number>
    violations?: string[]
    recommendations?: string[]
    metadata?: Record<string, any>
  }
  validation?: {
    passed?: boolean
    errors?: string[]
    warnings?: string[]
    info?: string[]
    metadata?: Record<string, any>
  }
  test?: {
    name?: string
    type?: string
    status?: string
    duration?: number
    results?: any
    metadata?: Record<string, any>
  }
  development?: {
    branch?: string
    commit?: string
    author?: string
    message?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  production?: {
    version?: string
    build?: string
    deployment?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  staging?: {
    version?: string
    build?: string
    deployment?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  local?: {
    machine?: string
    user?: string
    path?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  remote?: {
    host?: string
    port?: number
    protocol?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  client?: {
    type?: string
    version?: string
    platform?: string
    userAgent?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  server?: {
    type?: string
    version?: string
    platform?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  database?: {
    type?: string
    version?: string
    host?: string
    port?: number
    name?: string
    timestamp?: Date
    metadata?: Record<string, any>
  }
  cache?: {
    type?: string
    version?: string
    host?: string
    port?: number
    timestamp?: Date
    metadata?: Record<string, any>
  }
  session?: {
    id?: string
    startTime?: Date
    endTime?: Date
    duration?: number
    activity?: string[]
    metadata?: Record<string, any>
  }
  admin?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  moderator?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  guest?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  authenticated?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  unauthorized?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  authorized?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  unauthorized?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  valid?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  invalid?: {
    id?: string
    name?: string
    email?: string
    role?: string
    permissions?: string[]
    timestamp?: Date
    metadata?: Record<string, any>
  }
  metadata?: Record<string, any>
}

export interface PromptResult {
  success: boolean
  content?: string
  error?: string
  warnings?: string[]
  metadata?: Record<string, any>
  timestamp?: Date
  duration?: number
  size?: number
  format?: string
  encoding?: string
  compression?: string
  encryption?: string
  signing?: string
  validation?: string
  caching?: string
  logging?: string
  monitoring?: string
  alerting?: string
  rateLimiting?: string
  throttling?: string
  circuitBreaker?: string
  retry?: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  circuitBreakerThreshold?: number
  circuitBreakerTimeout?: number
  rateLimitThreshold?: number
  throttleThreshold?: number
  cacheTTL?: number
  cacheMaxSize?: number
  logLevel?: string
  monitorLevel?: string
  alertLevel?: string
  priority?: string
  category?: string
  tags?: string[]
  labels?: Record<string, string>
  annotations?: Record<string, string>
  customFields?: Record<string, any>
  extensions?: Record<string, any>
  plugins?: string[]
  middleware?: string[]
  handlers?: string[]
  processors?: string[]
  transformers?: string[]
  validators?: string[]
  serializers?: string[]
  deserializers?: string[]
  encoders?: string[]
  decoders?: string[]
  compressors?: string[]
  decompressors?: string[]
  encryptors?: string[]
  decryptors?: string[]
  signers?: string[]
  verifiers?: string[]
  authenticators?: string[]
  authorizers?: string[]
  auditors?: string[]
  loggers?: string[]
  monitors?: string[]
  alerters?: string[]
  notifiers?: string[]
  reporters?: string[]
  exporters?: string[]
  importers?: string[]
  migrators?: string[]
  updaters?: string[]
  cleaners?: string[]
  optimizers?: string[]
  analyzers?: string[]
  profilers?: string[]
  debuggers?: string[]
  testers?: string[]
  formatters?: string[]
  parsers?: string[]
  builders?: string[]
  generators?: string[]
  creators?: string[]
  destroyers?: string[]
  initializers?: string[]
  finalizers?: string[]
  constructors?: string[]
  destructors?: string[]
  factories?: string[]
  providers?: string[]
  consumers?: string[]
  producers?: string[]
  publishers?: string[]
  subscribers?: string[]
  observers?: string[]
  listeners?: string[]
  callbacks?: string[]
  hooks?: string[]
  events?: string[]
  signals?: string[]
  messages?: string[]
  commands?: string[]
  queries?: string[]
  responses?: string[]
  requests?: string[]
  replies?: string[]
  acknowledgments?: string[]
  confirmations?: string[]
  rejections?: string[]
  errors?: string[]
  exceptions?: string[]
  warnings?: string[]
  notices?: string[]
  info?: string[]
  debug?: string[]
  trace?: string[]
  audit?: string[]
  compliance?: string[]
  security?: string[]
  performance?: string[]
  quality?: string[]
  validation?: string[]
  test?: string[]
  development?: string[]
  production?: string[]
  staging?: string[]
  local?: string[]
  remote?: string[]
  client?: string[]
  server?: string[]
  database?: string[]
  cache?: string[]
  session?: string[]
  admin?: string[]
  moderator?: string[]
  guest?: string[]
  authenticated?: string[]
  unauthorized?: string[]
  authorized?: string[]
  unauthorized?: string[]
  valid?: string[]
  invalid?: string[]
}
