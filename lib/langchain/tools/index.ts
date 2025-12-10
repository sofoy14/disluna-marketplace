/**
 * Índice de Herramientas del Agente Legal
 * 
 * Exporta todas las herramientas disponibles para el agente.
 * La arquitectura está diseñada para ser extensible:
 * - Agregar nuevos archivos de tools en este directorio
 * - Importar y agregar al array ALL_TOOLS
 * 
 * Estructura:
 * - search-tools.ts: Herramientas de búsqueda web
 * - content-tools.ts: Herramientas de extracción de contenido
 * - article-search-tool.ts: Herramientas especializadas para buscar artículos de leyes
 */

import { StructuredTool } from "@langchain/core/tools"

// Importar herramientas de búsqueda
import { 
  searchTools,
  searchLegalOfficialTool,
  searchLegalAcademicTool,
  searchGeneralWebTool
} from "./search-tools"

// Importar herramientas de contenido
import { 
  contentTools,
  extractWebContentTool,
  verifySourcesTool
} from "./content-tools"

// Importar herramientas de búsqueda de artículos (PRIORITARIAS)
import {
  articleSearchTools,
  searchArticleTool,
  googleSearchDirectTool
} from "./article-search-tool"

// Importar herramienta de RAG para procesos (se crea dinámicamente con process_id)
import { createProcessRagTool } from "./process-rag-tool"

// ═══════════════════════════════════════════════════════════════════════════════
// TODAS LAS HERRAMIENTAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Array con todas las herramientas disponibles para el agente
 * 
 * ORDEN DE PRIORIDAD:
 * 1. buscar_articulo_ley - Para consultas de artículos específicos
 * 2. buscar_en_documentos_proceso - Para buscar en documentos del proceso (RAG) - se crea dinámicamente
 * 3. google_search_directo - Para búsquedas con extracción automática
 * 4. search_legal_official - Para búsquedas generales en fuentes oficiales
 * 5. extract_web_content - Para extraer contenido de URLs
 * 6. Otras herramientas
 */
export const ALL_TOOLS: StructuredTool[] = [
  // 🔴 PRIORITARIAS: Herramientas de búsqueda de artículos
  ...articleSearchTools,
  // Herramientas de búsqueda general
  ...searchTools,
  // Herramientas de contenido
  ...contentTools
]

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTAS POR CATEGORÍA
// ═══════════════════════════════════════════════════════════════════════════════

export const TOOL_CATEGORIES = {
  article: articleSearchTools,
  search: searchTools,
  content: contentTools
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene herramientas por nombre
 */
export function getToolsByNames(names: string[]): StructuredTool[] {
  return ALL_TOOLS.filter(tool => names.includes(tool.name))
}

/**
 * Obtiene información de todas las herramientas
 */
export function getToolsInfo() {
  return ALL_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description.substring(0, 100) + '...'
  }))
}

/**
 * Obtiene una herramienta por nombre
 */
export function getToolByName(name: string): StructuredTool | undefined {
  return ALL_TOOLS.find(tool => tool.name === name)
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTACIONES INDIVIDUALES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Article search tools (PRIORITY)
  articleSearchTools,
  searchArticleTool,
  googleSearchDirectTool,
  // Process RAG tools (factory function)
  createProcessRagTool,
  // Search tools
  searchTools,
  searchLegalOfficialTool,
  searchLegalAcademicTool,
  searchGeneralWebTool,
  // Content tools
  contentTools,
  extractWebContentTool,
  verifySourcesTool
}

// Re-exportar tipos útiles
export type { SearchResult } from "./search-tools"

