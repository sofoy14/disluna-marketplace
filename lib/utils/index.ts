/**
 * Utilidades Compartidas del Asistente Legal
 * 
 * Este archivo centraliza todas las utilidades reutilizables del sistema,
 * facilitando la importación y mantenimiento del código.
 */

// Utilidades de parsing JSON
export {
  parseJSON,
  parseJSONArray,
  parseJSONObject,
  safeParseJSON,
  validateJSONStructure
} from './json-parser'

// Utilidades de UUID
export {
  generateUUID,
  validateUUID,
  isUUID,
  generateShortId,
  generateLegalId
} from './uuid-utils'

// Utilidades de construcción de prompts
export {
  buildSystemPrompt,
  buildUserPrompt,
  buildContextPrompt,
  buildLegalPrompt,
  buildSearchPrompt,
  buildVerificationPrompt,
  buildSynthesisPrompt,
  buildErrorPrompt,
  buildSuccessPrompt,
  buildWarningPrompt,
  buildInfoPrompt,
  buildDebugPrompt,
  buildTracePrompt,
  buildAuditPrompt,
  buildCompliancePrompt,
  buildSecurityPrompt,
  buildPerformancePrompt,
  buildQualityPrompt,
  buildValidationPrompt,
  buildTestPrompt,
  buildDevelopmentPrompt,
  buildProductionPrompt,
  buildStagingPrompt,
  buildLocalPrompt,
  buildRemotePrompt,
  buildClientPrompt,
  buildServerPrompt,
  buildDatabasePrompt,
  buildCachePrompt,
  buildSessionPrompt,
  buildUserPrompt,
  buildAdminPrompt,
  buildModeratorPrompt,
  buildGuestPrompt,
  buildAuthenticatedPrompt,
  buildUnauthenticatedPrompt,
  buildAuthorizedPrompt,
  buildUnauthorizedPrompt,
  buildValidPrompt,
  buildInvalidPrompt
} from './prompt-builder'

// Utilidades de síntesis legal
export {
  synthesizeLegalResponse,
  quickLegalSynthesis,
  comprehensiveLegalSynthesis,
  detailedLegalSynthesis
} from './legal-synthesis'

// Tipos compartidos
export type {
  LegalSynthesisOptions,
  LegalSource,
  ResearchRound,
  LegalSynthesisResult,
  JSONParseResult,
  JSONParseOptions,
  UUIDValidationResult,
  PromptType,
  PromptOptions,
  PromptContext,
  PromptResult
} from './types'

// Constantes compartidas
export {
  PROMPT_TYPES,
  DEFAULT_PROMPT_OPTIONS,
  COMMON_PROMPT_PATTERNS,
  LEGAL_PROMPT_TEMPLATES,
  SYSTEM_PROMPT_TEMPLATES,
  USER_PROMPT_TEMPLATES,
  CONTEXT_PROMPT_TEMPLATES,
  SEARCH_PROMPT_TEMPLATES,
  VERIFICATION_PROMPT_TEMPLATES,
  SYNTHESIS_PROMPT_TEMPLATES,
  ERROR_PROMPT_TEMPLATES,
  SUCCESS_PROMPT_TEMPLATES,
  WARNING_PROMPT_TEMPLATES,
  INFO_PROMPT_TEMPLATES,
  DEBUG_PROMPT_TEMPLATES,
  TRACE_PROMPT_TEMPLATES,
  AUDIT_PROMPT_TEMPLATES,
  COMPLIANCE_PROMPT_TEMPLATES,
  SECURITY_PROMPT_TEMPLATES,
  PERFORMANCE_PROMPT_TEMPLATES,
  QUALITY_PROMPT_TEMPLATES,
  VALIDATION_PROMPT_TEMPLATES,
  TEST_PROMPT_TEMPLATES,
  DEVELOPMENT_PROMPT_TEMPLATES,
  PRODUCTION_PROMPT_TEMPLATES,
  STAGING_PROMPT_TEMPLATES,
  LOCAL_PROMPT_TEMPLATES,
  REMOTE_PROMPT_TEMPLATES,
  CLIENT_PROMPT_TEMPLATES,
  SERVER_PROMPT_TEMPLATES,
  DATABASE_PROMPT_TEMPLATES,
  CACHE_PROMPT_TEMPLATES,
  SESSION_PROMPT_TEMPLATES,
  USER_PROMPT_TEMPLATES,
  ADMIN_PROMPT_TEMPLATES,
  MODERATOR_PROMPT_TEMPLATES,
  GUEST_PROMPT_TEMPLATES,
  AUTHENTICATED_PROMPT_TEMPLATES,
  UNAUTHENTICATED_PROMPT_TEMPLATES,
  AUTHORIZED_PROMPT_TEMPLATES,
  UNAUTHORIZED_PROMPT_TEMPLATES,
  VALID_PROMPT_TEMPLATES,
  INVALID_PROMPT_TEMPLATES
} from './constants'