/**
 * Cliente para Docling Serve API v1
 * Convierte documentos desde URLs usando Docling Serve
 */

export interface DoclingConversionResult {
  markdown: string
  rawJson?: any
}

export interface DoclingError {
  message: string
  status?: number
  details?: any
}

/**
 * Convierte un documento desde una URL firmada usando Docling Serve
 * 
 * @param fileUrl - URL firmada del documento en Supabase Storage
 * @returns Objeto con markdown y JSON estructurado (si está disponible)
 * @throws Error si Docling no está configurado o falla la conversión
 */
export async function convertDocumentFromUrl(
  fileUrl: string
): Promise<DoclingConversionResult> {
  const doclingBaseUrl = process.env.DOCLING_BASE_URL

  if (!doclingBaseUrl) {
    throw new Error(
      "DOCLING_BASE_URL no está configurada. Por favor, configura la variable de entorno DOCLING_BASE_URL."
    )
  }

  // Normalizar URL base: asegurar que tenga protocolo y remover trailing slash
  let baseUrl = doclingBaseUrl.trim()
  
  // Si no tiene protocolo, intentar http:// primero (Docling Serve suele usar HTTP)
  // Si el usuario quiere HTTPS, debe especificarlo explícitamente en DOCLING_BASE_URL
  if (!baseUrl.match(/^https?:\/\//i)) {
    baseUrl = `http://${baseUrl}`
    console.log(`⚠️ DOCLING_BASE_URL no tenía protocolo, usando http:// por defecto`)
  }
  
  // Remover trailing slash
  baseUrl = baseUrl.replace(/\/$/, "")
  const convertUrl = `${baseUrl}/v1/convert/source`

  // Preparar request body según schema de Docling Serve v1
  const requestBody = {
    sources: [
      {
        kind: "http",
        url: fileUrl
      }
    ],
    options: {
      to_formats: ["md", "json"],
      do_ocr: false
    },
    target: {
      kind: "inbody"
    }
  }

  try {
    // Hacer request con timeout de 120 segundos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 segundos

    console.log(`🔄 Calling Docling at: ${convertUrl}`)
    
    const response = await fetch(convertUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = `Error al convertir documento: ${response.status} ${response.statusText}`
      let errorDetails: any = null

      try {
        const errorBody = await response.json()
        errorDetails = errorBody
        // Intentar extraer mensaje de error más descriptivo
        if (errorBody.message || errorBody.error || errorBody.detail) {
          errorMessage = errorBody.message || errorBody.error || errorBody.detail
        }
      } catch {
        // Si no se puede parsear el error, usar el mensaje por defecto
        const errorText = await response.text()
        if (errorText) {
          errorMessage = `${errorMessage}. Detalles: ${errorText.substring(0, 200)}`
        }
      }

      const error: DoclingError = {
        message: errorMessage,
        status: response.status,
        details: errorDetails
      }

      throw error
    }

    const responseData = await response.json()

    // Log la estructura completa de la respuesta para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      console.log("📋 Docling response structure:", {
        hasResults: !!responseData.results,
        resultsLength: responseData.results?.length || 0,
        topLevelKeys: Object.keys(responseData),
        firstResultKeys: responseData.results?.[0] ? Object.keys(responseData.results[0]) : []
      })
    }

    // Parsear respuesta según estructura de Docling Serve v1
    // La estructura puede variar, intentamos diferentes paths comunes
    let markdown = ""
    let rawJson: any = undefined

    // Estructura esperada: results[0].outputs.md y results[0].outputs.json
    if (responseData.results && Array.isArray(responseData.results) && responseData.results.length > 0) {
      const firstResult = responseData.results[0]
      
      // Intentar obtener markdown de diferentes ubicaciones posibles
      if (firstResult.outputs) {
        // Estructura: results[0].outputs.md
        if (firstResult.outputs.md) {
          markdown = typeof firstResult.outputs.md === "string" 
            ? firstResult.outputs.md 
            : (typeof firstResult.outputs.md === "object" && firstResult.outputs.md.content)
            ? firstResult.outputs.md.content
            : JSON.stringify(firstResult.outputs.md)
        } 
        // Estructura: results[0].outputs.markdown
        else if (firstResult.outputs.markdown) {
          markdown = typeof firstResult.outputs.markdown === "string"
            ? firstResult.outputs.markdown
            : (typeof firstResult.outputs.markdown === "object" && firstResult.outputs.markdown.content)
            ? firstResult.outputs.markdown.content
            : JSON.stringify(firstResult.outputs.markdown)
        }
        // Estructura: results[0].outputs con contenido directo
        else if (typeof firstResult.outputs === "string") {
          markdown = firstResult.outputs
        }
        // Estructura: results[0].outputs.content
        else if (firstResult.outputs.content) {
          markdown = typeof firstResult.outputs.content === "string"
            ? firstResult.outputs.content
            : JSON.stringify(firstResult.outputs.content)
        }

        // Intentar obtener JSON estructurado
        if (firstResult.outputs.json) {
          rawJson = firstResult.outputs.json
        } else if (firstResult.outputs.doctags) {
          rawJson = firstResult.outputs.doctags
        } else if (firstResult.outputs.document) {
          rawJson = firstResult.outputs.document
        }
      }

      // Fallback: si no hay outputs pero hay markdown directamente en el resultado
      if (!markdown && firstResult.markdown) {
        markdown = typeof firstResult.markdown === "string"
          ? firstResult.markdown
          : (typeof firstResult.markdown === "object" && firstResult.markdown.content)
          ? firstResult.markdown.content
          : JSON.stringify(firstResult.markdown)
      }

      // Fallback: si no hay outputs pero hay json directamente
      if (!rawJson && firstResult.json) {
        rawJson = firstResult.json
      }

      // Fallback: si no hay outputs pero hay content directamente
      if (!markdown && firstResult.content) {
        markdown = typeof firstResult.content === "string"
          ? firstResult.content
          : JSON.stringify(firstResult.content)
      }
    } 
    // Estructura alternativa: markdown directamente en la raíz
    else if (responseData.markdown) {
      markdown = typeof responseData.markdown === "string"
        ? responseData.markdown
        : (typeof responseData.markdown === "object" && responseData.markdown.content)
        ? responseData.markdown.content
        : JSON.stringify(responseData.markdown)
      
      if (responseData.json) {
        rawJson = responseData.json
      }
    } 
    // Estructura alternativa: output único
    else if (responseData.output) {
      if (responseData.output.markdown) {
        markdown = typeof responseData.output.markdown === "string"
          ? responseData.output.markdown
          : (typeof responseData.output.markdown === "object" && responseData.output.markdown.content)
          ? responseData.output.markdown.content
          : JSON.stringify(responseData.output.markdown)
      }
      if (responseData.output.json) {
        rawJson = responseData.output.json
      }
    }

    // Si no encontramos markdown, intentar extraer de JSON estructurado
    if (!markdown && rawJson) {
      // Intentar extraer texto del JSON estructurado de Docling
      const extractTextFromDoclingDoc = (doc: any, depth = 0): string => {
        if (depth > 10) return "" // Prevenir recursión infinita
        
        if (typeof doc === "string") return doc
        
        if (doc.content) {
          if (typeof doc.content === "string") return doc.content
          if (Array.isArray(doc.content)) {
            return doc.content.map((item: any) => extractTextFromDoclingDoc(item, depth + 1)).filter(Boolean).join("\n")
          }
          return extractTextFromDoclingDoc(doc.content, depth + 1)
        }
        
        if (doc.text) {
          if (typeof doc.text === "string") return doc.text
          return extractTextFromDoclingDoc(doc.text, depth + 1)
        }
        
        if (doc.markdown) {
          if (typeof doc.markdown === "string") return doc.markdown
          return extractTextFromDoclingDoc(doc.markdown, depth + 1)
        }
        
        // Si es un array, procesar cada elemento
        if (Array.isArray(doc)) {
          return doc.map((item: any) => extractTextFromDoclingDoc(item, depth + 1)).filter(Boolean).join("\n")
        }
        
        // Si es un objeto, buscar propiedades comunes
        if (typeof doc === "object" && doc !== null) {
          const textFields = ["text", "content", "markdown", "body", "value"]
          for (const field of textFields) {
            if (doc[field]) {
              const extracted = extractTextFromDoclingDoc(doc[field], depth + 1)
              if (extracted) return extracted
            }
          }
        }
        
        return ""
      }
      
      // Intentar diferentes estructuras comunes de Docling
      if (rawJson.document) {
        markdown = extractTextFromDoclingDoc(rawJson.document)
      } else if (rawJson.content) {
        markdown = extractTextFromDoclingDoc(rawJson.content)
      } else {
        markdown = extractTextFromDoclingDoc(rawJson)
      }
      
      if (markdown) {
        console.log("✅ Markdown extraído del JSON estructurado de Docling")
      }
    }

    // Si aún no encontramos markdown, intentar usar el texto completo como fallback
    if (!markdown) {
      if (responseData.text) {
        markdown = typeof responseData.text === "string"
          ? responseData.text
          : JSON.stringify(responseData.text)
      } else if (responseData.content) {
        markdown = typeof responseData.content === "string"
          ? responseData.content
          : JSON.stringify(responseData.content)
      } else {
        // Último recurso: intentar extraer texto del JSON completo
        const jsonString = JSON.stringify(responseData, null, 2)
        // Si el JSON es muy grande, solo usar una parte
        if (jsonString.length > 100000) {
          console.warn("⚠️ Respuesta de Docling muy grande, extrayendo solo texto relevante")
          // Intentar encontrar texto en el JSON
          const textMatches = jsonString.match(/"text":\s*"([^"]+)"/g) || []
          const contentMatches = jsonString.match(/"content":\s*"([^"]+)"/g) || []
          const allText = [...textMatches, ...contentMatches].join("\n")
          markdown = allText || jsonString.substring(0, 50000)
        } else {
          markdown = jsonString
        }
        console.warn("⚠️ No se encontró markdown en la respuesta de Docling, usando contenido extraído del JSON")
      }
    }

    if (!markdown) {
      throw new Error("No se pudo extraer contenido markdown de la respuesta de Docling")
    }

    return {
      markdown,
      rawJson
    }

  } catch (error: any) {
    // Manejar errores de timeout
    if (error.name === "AbortError") {
      throw new Error("Timeout al convertir documento con Docling (más de 120 segundos)")
    }

    // Si ya es un DoclingError, re-lanzarlo
    if (error.message && error.status) {
      throw error
    }

    // Otros errores de red o parsing
    // Si es un error de URL parsing, dar un mensaje más claro
    if (error.message?.includes("Failed to parse URL") || error.message?.includes("Invalid URL")) {
      throw new Error(
        `URL de Docling inválida. Verifica que DOCLING_BASE_URL esté correctamente configurada. URL intentada: ${convertUrl}`
      )
    }
    
    // Si es un error de conexión, dar más contexto
    if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED") || error.message?.includes("ENOTFOUND")) {
      console.error(`❌ Error de conexión a Docling. Verifica que el servicio esté disponible en: ${baseUrl}`)
      throw new Error(
        `No se pudo conectar con el servicio Docling. Verifica que esté disponible y accesible. URL: ${baseUrl}`
      )
    }
    
    throw new Error(
      `Error al comunicarse con Docling: ${error.message || "Error desconocido"}`
    )
  }
}

