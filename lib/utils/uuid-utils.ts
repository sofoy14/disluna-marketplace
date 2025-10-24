/**
 * Utilidades para manejo de UUIDs
 * Centraliza la lógica de validación y generación de UUIDs
 */

import { v4 as uuidv4, validate as validateUuid } from 'uuid'

/**
 * Genera un UUID válido
 */
export function generateUUID(): string {
  return uuidv4()
}

/**
 * Valida si una cadena es un UUID válido
 */
export function isValidUUID(uuid: string): boolean {
  return validateUuid(uuid)
}

/**
 * Genera un UUID válido a partir de una cadena que puede no ser válida
 */
export function generateValidUUID(input: string): string {
  // Si ya es un UUID válido, devolverlo
  if (isValidUUID(input)) {
    return input
  }

  // Si es una cadena vacía o muy corta, generar uno nuevo
  if (!input || input.length < 8) {
    return generateUUID()
  }

  // Intentar generar un UUID basado en la entrada
  try {
    // Usar la entrada como semilla para generar un UUID determinístico
    const hash = simpleHash(input)
    const uuid = generateDeterministicUUID(hash)
    return uuid
  } catch (error) {
    // Si falla, generar un UUID aleatorio
    return generateUUID()
  }
}

/**
 * Genera un UUID determinístico basado en un hash
 */
function generateDeterministicUUID(hash: number): string {
  // Convertir el hash a un formato UUID v4
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  const uuid = `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-${hex.slice(0, 4)}-${hex.slice(0, 12)}`
  return uuid
}

/**
 * Función hash simple para generar números determinísticos
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convertir a entero de 32 bits
  }
  return hash
}

/**
 * Normaliza una cadena para uso como identificador
 */
export function normalizeIdentifier(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Genera un identificador único basado en una cadena
 */
export function generateUniqueIdentifier(input: string): string {
  const normalized = normalizeIdentifier(input)
  const hash = simpleHash(normalized)
  const timestamp = Date.now().toString(36)
  return `${normalized}-${hash.toString(36)}-${timestamp}`
}

/**
 * Valida múltiples UUIDs
 */
export function validateMultipleUUIDs(uuids: string[]): {
  valid: string[]
  invalid: string[]
} {
  const valid: string[] = []
  const invalid: string[] = []

  uuids.forEach(uuid => {
    if (isValidUUID(uuid)) {
      valid.push(uuid)
    } else {
      invalid.push(uuid)
    }
  })

  return { valid, invalid }
}

/**
 * Genera UUIDs válidos para múltiples entradas
 */
export function generateValidUUIDs(inputs: string[]): string[] {
  return inputs.map(input => generateValidUUID(input))
}

/**
 * Crea un prefijo UUID para agrupar elementos relacionados
 */
export function createUUIDPrefix(prefix: string): string {
  const normalizedPrefix = normalizeIdentifier(prefix)
  const uuid = generateUUID()
  return `${normalizedPrefix}-${uuid}`
}

/**
 * Extrae el prefijo de un UUID con prefijo
 */
export function extractUUIDPrefix(uuidWithPrefix: string): string | null {
  const parts = uuidWithPrefix.split('-')
  if (parts.length < 2) return null
  
  // El prefijo es todo excepto el último segmento (que es el UUID)
  const prefixParts = parts.slice(0, -1)
  return prefixParts.join('-')
}

