import OpenAI from "openai"

export interface LegalSearchPlan {
  queries: string[]
  rationale?: string
}

interface PlannerOptions {
  client: OpenAI
  model: string
  userQuery: string
  maxQueries?: number
}

export async function planLegalSearchStrategy({
  client,
  model,
  userQuery,
  maxQueries = 5,
}: PlannerOptions): Promise<LegalSearchPlan> {
  const systemPrompt = [
    "Eres un planificador de busquedas juridicas para derecho colombiano.",
    "Tu objetivo es decidir cuantas busquedas web ejecutar y con que terminos especificos.",
    "Responde UNICAMENTE en JSON con el formato:",
    `{"queries":[{"query":"...", "reason":"..."}], "notes":"..."} `,
    `- "queries" debe tener entre 0 y ${maxQueries} elementos.`,
    "- Ajusta cada consulta para priorizar fuentes oficiales colombianas.",
    "- Incluye site: si es claro que debe buscarse en un dominio oficial.",
    "- Si no es necesaria busqueda, retorna una lista vacia y explica por que en notes.",
    "- No incluyas texto adicional fuera del JSON.",
  ].join(" ")

  const userPrompt = [
    `Consulta del usuario: "${userQuery}"`,
    "Analiza si la informacion puede requerir datos actualizados, jurisprudencia especifica o confirmacion normativa.",
    "Devuelve un plan de busqueda con cada consulta enfocada.",
  ].join("\n")

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
      stream: false,
    })

    const rawContent =
      completion.choices?.[0]?.message?.content?.trim() ?? '{"queries":[]}'

    const plan = parsePlan(rawContent, maxQueries)
    return plan
  } catch (error) {
    console.error("[legal-search-planner] Error obteniendo plan:", error)
    return { queries: [] }
  }
}

function parsePlan(content: string, maxQueries: number): LegalSearchPlan {
  try {
    const jsonText = extractJson(content)
    const parsed = JSON.parse(jsonText)

    if (!Array.isArray(parsed?.queries)) {
      return { queries: [] }
    }

    const queries = parsed.queries
      .slice(0, maxQueries)
      .map((item: any) =>
        typeof item?.query === "string" ? item.query.trim() : ""
      )
      .filter((query: string) => query.length > 0)

    const rationale =
      typeof parsed?.notes === "string" ? parsed.notes.trim() : undefined

    return {
      queries,
      rationale,
    }
  } catch (error) {
    console.warn(
      "[legal-search-planner] No se pudo parsear el JSON del plan de busqueda:",
      error
    )
    return { queries: [] }
  }
}

function extractJson(content: string): string {
  const start = content.indexOf("{")
  const end = content.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Respuesta sin objeto JSON valido")
  }

  return content.slice(start, end + 1)
}
