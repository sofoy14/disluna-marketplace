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
 * - [futuro] analysis-tools.ts: Herramientas de análisis
 * - [futuro] document-tools.ts: Herramientas de documentos
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

// ═══════════════════════════════════════════════════════════════════════════════
// TODAS LAS HERRAMIENTAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Array con todas las herramientas disponibles para el agente
 * 
 * Para agregar nuevas herramientas:
 * 1. Crear el archivo de tools (ej: my-tools.ts)
 * 2. Importar las herramientas
 * 3. Agregarlas a este array
 */
export const ALL_TOOLS: StructuredTool[] = [
  // Herramientas de búsqueda
  ...searchTools,
  // Herramientas de contenido
  ...contentTools
]

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTAS POR CATEGORÍA
// ═══════════════════════════════════════════════════════════════════════════════

export const TOOL_CATEGORIES = {
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

