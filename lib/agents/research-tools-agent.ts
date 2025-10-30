import OpenAI from "openai"

export interface ResearchAgentConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ResearchAgentResponse {
  text: string
  sources: Array<{ id?: string; title: string; url: string; type?: string; description?: string }>
}

export class ResearchToolsAgent {
  private client: OpenAI
  private config: ResearchAgentConfig

  constructor(config: ResearchAgentConfig) {
    this.config = {
      model: "alibaba/tongyi-deepresearch-30b-a3b",
      temperature: 0.2,
      maxTokens: 2200,
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
  }

  private async serperSearch(query: string): Promise<any> {
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) throw new Error("SERPER_API_KEY no configurada")

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query, gl: "co", hl: "es", num: 12 })
    })
    if (!res.ok) throw new Error(`Serper ${res.status}`)
    return res.json()
  }

  private async httpFetch(url: string): Promise<string> {
    const maxBytes = 400_000
    let attempt = 0
    while (attempt < 2) {
      attempt++
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
      if (res.status === 429) { await new Promise(r => setTimeout(r, 500 * attempt)); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html = await res.text()
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      return text.slice(0, maxBytes)
    }
    throw new Error("Rate limited")
  }

  private async jinaRead(url: string): Promise<string> {
    // Lector de contenido de Jina AI (endpoint público de lectura)
    const jinaUrl = `https://r.jina.ai/${url}`
    const res = await fetch(jinaUrl)
    if (!res.ok) return ""
    const text = await res.text()
    return text.slice(0, 400_000)
  }

  private extractSourcesFromSerper(data: any): Array<{ title: string; url: string }> {
    const items = data?.organic || []
    return items
      .filter((i: any) => i?.link && i?.title)
      .slice(0, 15)
      .map((i: any) => ({ title: i.title, url: i.link }))
  }

  private uniqueByUrl(items: Array<{ title: string; url: string }>) {
    const seen = new Set<string>()
    return items.filter(i => { const k = new URL(i.url).hostname + new URL(i.url).pathname; if (seen.has(k)) return false; seen.add(k); return true })
  }

  async processQuery(userQuery: string): Promise<ResearchAgentResponse> {
    // Definir herramientas para tool-calling
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "serper_search",
          description: "Busca en la web con Serper (Google). Devuelve resultados relevantes.",
          parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "http_fetch",
          description: "Obtiene y limpia HTML→texto de una URL para análisis.",
          parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "jina_read",
          description: "Lee y resume contenido de una URL usando el lector de Jina AI.",
          parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
        }
      }
    ]

    const system = `Eres un Agente de Investigación Legal Colombiano.
POLÍTICA:
- Prioriza fuentes oficiales (Corte Constitucional, Consejo de Estado, SUIN, Diario Oficial, ministerios, superintendencias).
- No inventes números de artículos o leyes.
- Verifica consistencia entre múltiples fuentes.
RESPUESTA:
- Explicación clara, concisa, con contexto colombiano.
- No incluyas la bibliografía dentro del texto; solo el contenido. Las fuentes se enviarán por separado.`

    // 1ª llamada: el modelo decide herramientas
    const first = await this.client.chat.completions.create({
      model: this.config.model!,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userQuery }
      ],
      tools,
      tool_choice: "auto",
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    })

    let messages: any[] = [
      { role: "system", content: system },
      { role: "user", content: userQuery },
      first.choices[0].message,
    ]

    // Ejecutar tools si fueron llamadas
    const toolCalls = first.choices[0].message?.tool_calls || []
    const collectedSources: Array<{ title: string; url: string }> = []

    for (const call of toolCalls) {
      const { name, arguments: args } = call.function
      const parsed = JSON.parse(args || "{}")
      try {
        if (name === "serper_search") {
          const data = await this.serperSearch(parsed.query)
          const rawSources = this.extractSourcesFromSerper(data)
          const uniq = this.uniqueByUrl(rawSources)
          collectedSources.push(...uniq)
          messages.push({ role: "tool", tool_call_id: call.id, name, content: JSON.stringify(uniq) })
        } else if (name === "http_fetch") {
          const content = await this.httpFetch(parsed.url)
          messages.push({ role: "tool", tool_call_id: call.id, name, content })
          collectedSources.push({ title: parsed.url, url: parsed.url })
        } else if (name === "jina_read") {
          const content = await this.jinaRead(parsed.url)
          messages.push({ role: "tool", tool_call_id: call.id, name, content })
          collectedSources.push({ title: parsed.url, url: parsed.url })
        }
      } catch (e) {
        messages.push({ role: "tool", tool_call_id: call.id, name, content: `ERROR: ${e instanceof Error ? e.message : "desconocido"}` })
      }
    }

    // 2ª llamada: síntesis final
    const final = await this.client.chat.completions.create({
      model: this.config.model!,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    })

    const text = final.choices[0]?.message?.content || "No se pudo generar respuesta."
    const unique = this.uniqueByUrl(collectedSources)
    return {
      text,
      sources: unique.map((s, i) => ({ id: `src-${i + 1}`, title: s.title, url: s.url }))
    }
  }
}


