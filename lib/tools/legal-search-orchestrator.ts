import { formatLegalSearchContext, normalizeLegalQuery } from "@/lib/prompts/legal-agent"
// ELIMINADO - archivos movidos durante refactorización
// import {
//   detectLegalQuery,
//   logLegalDetection,
//   LegalDetectionResult,
// } from "./smart-legal-detector"
// import { searchLegalSpecialized } from "./legal-search-specialized"
// import type { LegalSearchResponse, LegalSearchResult } from "./legal-search-specialized"

const DEFAULT_MAX_SEARCH_ATTEMPTS = 1
const DEFAULT_SEARCH_TIMEOUT_MS = 20000
const DEFAULT_MAX_RESULTS = 5

class SearchTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SearchTimeoutError"
  }
}

export interface LegalSourceSummary {
  title: string
  url: string
  type: LegalSearchResult["type"]
}

export interface LegalSearchWorkflowMetadata {
  attempts: number
  maxAttempts: number
  timedOut: boolean
  durationMs: number
  plannedQueries: string[]
  executedQueries: string[]
  searchExecuted: boolean
  searchSuccessful: boolean
  errorMessage?: string
}

export interface LegalSearchWorkflowResult {
  detection: LegalDetectionResult
  searchResponse?: LegalSearchResponse
  modelContext: string
  sources: LegalSourceSummary[]
  aggregatedResults: LegalSearchResult[]
  metadata: LegalSearchWorkflowMetadata
}

type WorkflowOptions = {
  maxResults?: number
  maxAttempts?: number
  searchTimeoutMs?: number
  searchQueries?: string[]
}

export async function runLegalSearchWorkflow(
  userQuery: string,
  options?: WorkflowOptions
): Promise<LegalSearchWorkflowResult> {
  const detection = detectLegalQuery(userQuery)
  logLegalDetection(userQuery, detection)

  const plannedQueries = sanitizeQueries(options?.searchQueries)
  const shouldSearch = detection.requiresWebSearch || plannedQueries.length > 0

  const baseQuery = normalizeLegalQuery(userQuery)
  const queriesToTry = shouldSearch
    ? plannedQueries.length > 0
      ? plannedQueries
      : [baseQuery]
    : []

  const planBasedMax = plannedQueries.length > 0 ? plannedQueries.length : 0

  const maxAttempts =
    options?.maxAttempts ??
    (planBasedMax > 0 ? planBasedMax : DEFAULT_MAX_SEARCH_ATTEMPTS)
  const maxResults = options?.maxResults ?? DEFAULT_MAX_RESULTS
  const timeoutMs = options?.searchTimeoutMs ?? DEFAULT_SEARCH_TIMEOUT_MS

  const executedQueries: string[] = []
  const aggregatedResults: LegalSearchResult[] = []

  let attempts = 0
  let timedOut = false
  let errorMessage: string | undefined
  let lastResponse: LegalSearchResponse | undefined

  const start = Date.now()

  for (const query of queriesToTry) {
    if (attempts >= maxAttempts) {
      break
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      continue
    }

    attempts += 1
    executedQueries.push(trimmedQuery)

    try {
      const response = await withTimeout(
        searchLegalSpecialized(trimmedQuery, maxResults),
        timeoutMs
      )

      lastResponse = response

      if (response.success && response.results?.length) {
        mergeResults(aggregatedResults, response.results, maxResults)
      } else if (response.error) {
        errorMessage = response.error
      }
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        timedOut = true
        errorMessage = error.message
        break
      }

      if (error instanceof Error) {
        errorMessage = error.message
      } else {
        errorMessage = "Error desconocido en la busqueda legal especializada"
      }
    }

    if (aggregatedResults.length >= maxResults) {
      break
    }
  }

  const durationMs = Date.now() - start
  const searchExecuted = executedQueries.length > 0
  const searchSuccessful = aggregatedResults.length > 0

  const finalResponse = searchSuccessful
    ? buildAggregatedResponse(userQuery, aggregatedResults, maxResults, executedQueries.length)
    : lastResponse

  const sources = searchSuccessful
    ? mapSourcesForResponse(aggregatedResults, maxResults)
    : []

  const modelContext = buildModelContext({
    userQuery,
    detection,
    plannedQueries,
    executedQueries,
    searchExecuted,
    searchSuccessful,
    aggregatedResults,
    lastResponse,
    timedOut,
    errorMessage,
    maxResults,
  })

  return {
    detection,
    searchResponse: finalResponse,
    modelContext,
    sources,
    aggregatedResults,
    metadata: {
      attempts,
      maxAttempts,
      timedOut,
      durationMs,
      plannedQueries,
      executedQueries,
      searchExecuted,
      searchSuccessful,
      errorMessage,
    },
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new SearchTimeoutError(
          `La busqueda legal supero el limite de ${timeoutMs} ms`
        )
      )
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutHandle!)
  }
}

function buildAggregatedResponse(
  userQuery: string,
  results: LegalSearchResult[],
  maxResults: number,
  attempts: number
): LegalSearchResponse {
  const limitedResults = results.slice(0, maxResults)

  return {
    success: true,
    query: userQuery,
    results: limitedResults,
    sources: limitedResults.map((item) => item.url),
    timestamp: new Date().toISOString(),
    searchStrategy: attempts > 1 ? `Plan con ${attempts} consultas` : "Consulta unica",
  }
}

function buildModelContext(params: {
  userQuery: string
  detection: LegalDetectionResult
  plannedQueries: string[]
  executedQueries: string[]
  searchExecuted: boolean
  searchSuccessful: boolean
  aggregatedResults: LegalSearchResult[]
  lastResponse?: LegalSearchResponse
  timedOut: boolean
  errorMessage?: string
  maxResults: number
}): string {
  const {
    userQuery,
    detection,
    plannedQueries,
    executedQueries,
    searchExecuted,
    searchSuccessful,
    aggregatedResults,
    lastResponse,
    timedOut,
    errorMessage,
    maxResults,
  } = params

  if (!searchExecuted) {
    return [
      "## ANALISIS AUTOMATICO DE BUSQUEDA",
      "Decision: no ejecutar busqueda web externa.",
      `Motivo: ${detection.reason}.`,
      `Confianza del clasificador: ${(detection.confidence * 100).toFixed(1)} %.`,
      plannedQueries.length
        ? `Plan del modelo: ${plannedQueries.join(" | ")}`
        : "Plan del modelo: sin consultas adicionales.",
      "",
      "INSTRUCCIONES PARA EL MODELO:",
      "- Responde con tu conocimiento legal colombiano interno.",
      "- Evita mencionar que se realizo una busqueda web.",
      "- Si consideras necesaria una verificacion adicional, sugiere explicitamente una nueva busqueda al usuario.",
      "- Manten la seccion `## Fuentes Consultadas` indicando que no se emplearon URLs externas en esta respuesta.",
    ].join("\n")
  }

  if (timedOut) {
    return [
      "## BUSQUEDA JURIDICA EJECUTADA CON ERROR",
      `Consulta original: "${userQuery}".`,
      `Consultas planificadas: ${plannedQueries.join(" | ") || "no definidas"}.`,
      `Consultas ejecutadas: ${executedQueries.join(" | ") || "ninguna"}.`,
      `Motor utilizado: Serper (maximo ${maxResults} resultados).`,
      "Resultado: la busqueda excedio el tiempo limite.",
      "",
      "INSTRUCCIONES PARA EL MODELO:",
      "- Explica que se intento una busqueda web juridica pero expiro por tiempo.",
      "- Responde con tu conocimiento legal vigente, indicando las salvedades necesarias.",
      "- Manten la seccion `## Fuentes Consultadas` aclarando que no se obtuvieron fuentes externas.",
    ].join("\n")
  }

  if (!searchSuccessful) {
    const failureReason = lastResponse?.error
      ? `Detalle tecnico: ${lastResponse.error}.`
      : errorMessage
      ? `Detalle tecnico: ${errorMessage}.`
      : "Detalle tecnico: la API no devolvio resultados relevantes."

    const summary = [
      "## BUSQUEDA JURIDICA EJECUTADA SIN FUENTES",
      `Consulta original: "${userQuery}".`,
      `Consultas planificadas: ${plannedQueries.join(" | ") || "no definidas"}.`,
      `Consultas ejecutadas: ${executedQueries.join(" | ") || "ninguna"}.`,
      `Motor utilizado: Serper (maximo ${maxResults} resultados).`,
      "Resultado: no se encontraron fuentes confiables.",
      failureReason,
      "",
    ].join("\n")

    return `${summary}${formatLegalSearchContext(
      "No se obtuvieron fuentes verificables para esta consulta. Aun asi, debes explicar tu respuesta y sugerir pasos de verificacion adicionales.",
      userQuery
    )}`
  }

  const headerLines = [
    "## BUSQUEDA JURIDICA EJECUTADA",
    `Consulta original: "${userQuery}".`,
    `Consultas planificadas: ${plannedQueries.join(" | ") || "no definidas"}.`,
    `Consultas ejecutadas: ${executedQueries.join(" | ") || "ninguna"}.`,
    `Motor utilizado: Serper (maximo ${maxResults} resultados).`,
    "Fuentes priorizadas: sitios oficiales, academicos y especializados de Colombia.",
    "",
  ]

  const resultsBlock = formatResultsForPrompt(aggregatedResults, maxResults)
  const verificationBlock = buildVerificationChecklist(aggregatedResults)

  return formatLegalSearchContext(
    [headerLines.join("\n") + resultsBlock, verificationBlock].join("\n\n"),
    userQuery
  )
}

function formatResultsForPrompt(
  results: LegalSearchResult[],
  maxResults: number
): string {
  if (!results || results.length === 0) {
    return "No se encontraron fuentes legales relevantes."
  }

  return results
    .slice(0, maxResults)
    .map((result, index) => {
      const label = getSourceLabel(result.type)
      const hostname = extractHostname(result.url)
      const snippet = sanitizeSnippet(result.snippet)

      return [
        `FUENTE ${index + 1} ${label}`,
        `Titulo: ${result.title}`,
        `Dominio: ${hostname}`,
        `URL: ${result.url}`,
        `Resumen: ${snippet}`,
        "---",
      ].join("\n")
    })
    .join("\n")
}

function mapSourcesForResponse(
  results: LegalSearchResult[],
  maxResults: number
): LegalSourceSummary[] {
  return results.slice(0, maxResults).map((result) => ({
    title: result.title,
    url: result.url,
    type: result.type,
  }))
}

function getSourceLabel(type: LegalSearchResult["type"]): string {
  switch (type) {
    case "official":
      return "[OFICIAL]"
    case "academic":
      return "[ACADEMICA]"
    case "news":
      return "[PRENSA ESPECIALIZADA]"
    default:
      return "[FUENTE COMPLEMENTARIA]"
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch (_error) {
    return "dominio-desconocido"
  }
}

function sanitizeSnippet(snippet: string): string {
  return snippet.replace(/\s+/g, " ").trim().slice(0, 500)
}

function mergeResults(
  accumulator: LegalSearchResult[],
  incoming: LegalSearchResult[],
  maxResults: number
) {
  const seenUrls = new Set(accumulator.map((item) => item.url))

  for (const result of incoming) {
    if (seenUrls.has(result.url)) {
      continue
    }

    accumulator.push(result)
    seenUrls.add(result.url)

    if (accumulator.length >= maxResults * 2) {
      break
    }
  }

  accumulator.sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
}

function sanitizeQueries(queries: string[] | undefined): string[] {
  if (!queries || queries.length === 0) {
    return []
  }

  return queries
    .map((query) => query.trim())
    .filter((query) => query.length > 0)
}

function buildVerificationChecklist(results: LegalSearchResult[]): string {
  if (!results.length) {
    return "## Checklist de Verificacion\n- Sin fuentes externas para verificar."
  }

  const lines: string[] = ["## Checklist de Verificacion"]

  results.forEach((result, index) => {
    const references = extractLegalReferences(`${result.title} ${result.snippet}`)
    const label = references.length
      ? `Referencias detectadas: ${references.join("; ")}`
      : "Referencias especificas no detectadas; revisa manualmente la cita."

    lines.push(
      `- Fuente ${index + 1}: ${result.title} (${result.url})`,
      `  ${label}`
    )
  })

  lines.push(
    "- Verifica que cada cita de tu respuesta coincida con el texto y vigencia de la fuente enlazada.",
    "- Marca discrepancias explicando el conflicto y su implicacion."
  )

  return lines.join("\n")
}

function extractLegalReferences(text: string): string[] {
  const patterns: RegExp[] = [
    /\barticulo\s+\d+[a-z]?/gi,
    /\barts?\.\s*\d+[a-z]?/gi,
    /\bley\s+\d+\s+de\s+\d{4}/gi,
    /\bdecreto\s+\d+\s+de\s+\d{4}/gi,
    /\bautos?\s+\d+\s+de\s+\d{4}/gi,
    /\bsentencia\s+[stc]\-\d+[a-z0-9\-]*/gi,
    /\bprovidencia\s+\d+\s+de\s+\d{4}/gi,
    /\bresolucion\s+\d+\s+de\s+\d{4}/gi,
  ]

  const matches = new Set<string>()
  patterns.forEach((pattern) => {
    const found = text.match(pattern)
    if (found) {
      found.forEach((item) => matches.add(normalizeReference(item)))
    }
  })

  return Array.from(matches)
}

function normalizeReference(reference: string): string {
  return reference.trim().replace(/\s+/g, " ").toLowerCase()
}
