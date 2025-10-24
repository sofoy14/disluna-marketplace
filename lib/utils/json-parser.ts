/**
 * Utilidades para parsing de JSON de respuestas de LLM
 * Centraliza la lógica de extracción y parsing de JSON
 */

export interface ParseResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Extrae JSON del contenido de respuesta del LLM
 */
export function extractJson(content: string): string {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON no encontrado en el contenido")
  }
  return content.slice(start, end + 1)
}

/**
 * Parsea JSON de manera segura con valores por defecto
 */
export function parseJsonSafely<T>(
  content: string, 
  defaultValue: T,
  errorMessage?: string
): ParseResult<T> {
  try {
    const jsonContent = extractJson(content)
    const parsed = JSON.parse(jsonContent)
    return {
      success: true,
      data: parsed
    }
  } catch (error) {
    console.error(errorMessage || 'Error parseando JSON:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      data: defaultValue
    }
  }
}

/**
 * Parsea JSON con validación de campos requeridos
 */
export function parseJsonWithValidation<T>(
  content: string,
  requiredFields: (keyof T)[],
  defaultValue: T
): ParseResult<T> {
  const parseResult = parseJsonSafely(content, defaultValue)
  
  if (!parseResult.success || !parseResult.data) {
    return parseResult
  }

  // Validar campos requeridos
  const missingFields = requiredFields.filter(field => 
    parseResult.data![field] === undefined || parseResult.data![field] === null
  )

  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
      data: defaultValue
    }
  }

  return parseResult
}

/**
 * Parsea JSON con transformación de datos
 */
export function parseJsonWithTransform<T, R>(
  content: string,
  transformer: (data: T) => R,
  defaultValue: R
): ParseResult<R> {
  const parseResult = parseJsonSafely<T>(content, {} as T)
  
  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
      data: defaultValue
    }
  }

  try {
    const transformed = transformer(parseResult.data)
    return {
      success: true,
      data: transformed
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error en transformación',
      data: defaultValue
    }
  }
}

/**
 * Parsea múltiples objetos JSON del mismo contenido
 */
export function parseMultipleJson<T>(
  content: string,
  defaultValue: T[]
): ParseResult<T[]> {
  try {
    // Buscar múltiples objetos JSON
    const jsonObjects: string[] = []
    let start = 0
    
    while (start < content.length) {
      const objStart = content.indexOf("{", start)
      if (objStart === -1) break
      
      const objEnd = content.indexOf("}", objStart)
      if (objEnd === -1) break
      
      jsonObjects.push(content.slice(objStart, objEnd + 1))
      start = objEnd + 1
    }

    if (jsonObjects.length === 0) {
      return {
        success: false,
        error: "No se encontraron objetos JSON",
        data: defaultValue
      }
    }

    const parsed = jsonObjects.map(json => JSON.parse(json))
    return {
      success: true,
      data: parsed
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error parseando múltiples JSON',
      data: defaultValue
    }
  }
}

/**
 * Valida que un objeto tenga la estructura esperada
 */
export function validateJsonStructure<T>(
  data: any,
  validator: (data: any) => data is T
): ParseResult<T> {
  if (validator(data)) {
    return {
      success: true,
      data
    }
  } else {
    return {
      success: false,
      error: "Estructura de datos inválida",
      data: undefined as any
    }
  }
}

