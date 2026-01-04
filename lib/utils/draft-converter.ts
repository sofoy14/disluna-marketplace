/**
 * Utilidades para convertir contenido de texto plano a formato Draft
 * cuando el modelo no genera JSON directamente
 */

import { LegalDraft } from "@/types/draft"
import { extractPlaceholderKeys } from "./draft-utils"

/**
 * Detecta el tipo de documento basado en el contenido
 */
function detectDocTypeFromContent(content: string): LegalDraft["doc_type"] {
  const lowerContent = content.toLowerCase()
  
  // Detección más específica
  if (lowerContent.includes("contrato de arrendamiento") || 
      lowerContent.includes("arrendamiento inmobiliario") ||
      lowerContent.includes("contrato") && (lowerContent.includes("arrendamiento") || lowerContent.includes("compraventa") || lowerContent.includes("prestación de servicios"))) {
    return "contrato"
  }
  if (lowerContent.includes("tutela") || lowerContent.includes("acción de tutela") || lowerContent.includes("accion de tutela")) {
    return "tutela"
  }
  if (lowerContent.includes("derecho de petición") || lowerContent.includes("derecho de peticion")) {
    return "derecho_de_peticion"
  }
  if (lowerContent.includes("memorial")) {
    return "memorial"
  }
  if (lowerContent.includes("comunicado") || lowerContent.includes("oficio")) {
    return "comunicado"
  }
  if (lowerContent.includes("correo") || lowerContent.includes("email") || lowerContent.includes("e-mail")) {
    return "correo"
  }
  if (lowerContent.includes("minuta")) {
    return "minuta"
  }
  if (lowerContent.includes("contrato")) {
    return "contrato"
  }
  
  return "otro"
}

/**
 * Extrae el título del documento del contenido
 */
function extractTitle(content: string, docType: LegalDraft["doc_type"]): string {
  // Buscar primera línea que parezca un título
  const lines = content.split('\n').filter(line => line.trim().length > 0)
  
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim()
    // Si es un título en markdown o mayúsculas
    if (trimmed.startsWith('#') || trimmed === trimmed.toUpperCase() && trimmed.length < 100) {
      return trimmed.replace(/^#+\s*/, '').trim()
    }
  }
  
  // Fallback: usar tipo de documento
  const typeNames: Record<LegalDraft["doc_type"], string> = {
    contrato: "Contrato",
    minuta: "Minuta",
    tutela: "Acción de Tutela",
    derecho_de_peticion: "Derecho de Petición",
    memorial: "Memorial",
    comunicado: "Comunicado",
    correo: "Correo",
    otro: "Documento Legal"
  }
  
  return typeNames[docType] || "Documento Legal"
}

/**
 * Convierte contenido de texto plano a formato Draft
 * Útil cuando el modelo genera texto en lugar de JSON
 */
export function convertTextToDraft(content: string, userMessage?: string): LegalDraft | null {
  if (!content || content.trim().length < 50) {
    return null
  }

  const docType = detectDocTypeFromContent(content)
  const title = extractTitle(content, docType)
  
  // Extraer placeholders del contenido
  const placeholderKeys = extractPlaceholderKeys(content)
  const placeholders = placeholderKeys.map(key => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    example: ""
  }))

  // Detectar información faltante basada en placeholders y contenido
  const missingInfo: string[] = []
  if (placeholderKeys.length > 0) {
    missingInfo.push(`Completar ${placeholderKeys.length} placeholder(s) detectado(s)`)
  }
  if (content.includes("[") && content.includes("]")) {
    missingInfo.push("Revisar campos entre corchetes [ ]")
  }

  // Crear el draft
  const draft: LegalDraft = {
    type: "draft",
    doc_type: docType,
    title,
    jurisdiction: "CO",
    language: "es-CO",
    content_markdown: content,
    placeholders: placeholders.length > 0 ? placeholders : undefined,
    missing_info: missingInfo.length > 0 ? missingInfo : undefined,
    notes: [
      "⚠️ Documento preliminar, requiere revisión profesional, no sustituye asesoría legal.",
      "Este documento fue generado automáticamente y debe ser revisado antes de su uso."
    ],
    email: docType === "correo" ? {
      subject: title,
      body: content
    } : undefined
  }

  return draft
}

/**
 * Intenta convertir contenido a draft, primero como JSON, luego como texto
 */
export function tryConvertToDraft(content: string, userMessage?: string): LegalDraft | null {
  if (!content || content.trim().length < 100) {
    return null
  }
  
  // Primero intentar como JSON
  const { validateDraftContent } = require("./draft-utils")
  const jsonValidation = validateDraftContent(content)
  
  if (jsonValidation.valid && jsonValidation.draft) {
    return jsonValidation.draft
  }
  
  // Si no es JSON válido, intentar convertir desde texto
  // Solo si parece ser un documento legal estructurado
  const looksLikeDocument = 
    content.includes("ARTÍCULO") ||
    content.includes("ARTICULO") ||
    content.includes("CONTRATO") ||
    content.includes("TUTELA") ||
    content.includes("DEMANDA") ||
    content.includes("MEMORIAL") ||
    content.includes("ARRENDAMIENTO") ||
    content.includes("LEY APLICABLE") ||
    content.includes("PARTES") && content.includes(":") ||
    (content.length > 500 && (content.includes(":") || content.includes("ART"))) // Documentos largos con estructura
  
  if (looksLikeDocument) {
    return convertTextToDraft(content, userMessage)
  }
  
  return null
}

