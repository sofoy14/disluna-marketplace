import OpenAI from "openai"

export interface ResearchAgentConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
  maxRounds?: number              // Máximo de rondas de búsqueda iterativa
  minSourcesForCompletion?: number // Mínimo de fuentes para considerar completa
  requireOfficialSources?: boolean // Requerir al menos una fuente oficial
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
      maxRounds: 5,
      minSourcesForCompletion: 3,
      requireOfficialSources: true,
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
  }

  private async serperSearch(query: string | string[]): Promise<any> {
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) throw new Error("SERPER_API_KEY no configurada")

    // Si es array, ejecutar búsquedas en paralelo y combinar resultados
    if (Array.isArray(query)) {
      console.log(`🔍 ResearchToolsAgent: Búsqueda múltiple con ${query.length} queries`)
      
      const searchPromises = query.map(q => {
        return fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ q: q.trim(), gl: "co", hl: "es", num: 12 })
        }).then(res => {
          if (!res.ok) throw new Error(`Serper ${res.status}`)
          return res.json()
        })
      })
      
      const results = await Promise.allSettled(searchPromises)
      const allItems: any[] = []
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.organic) {
          allItems.push(...result.value.organic)
        } else {
          console.warn(`⚠️ Búsqueda ${index + 1} falló en ResearchToolsAgent`)
        }
      })
      
      // Eliminar duplicados por URL
      const uniqueItems = Array.from(
        new Map(allItems.map((item: any) => [item.link, item])).values()
      )
      
      console.log(`✅ ResearchToolsAgent: ${uniqueItems.length} resultados únicos de ${allItems.length} totales`)
      
      // Retornar formato compatible
      return { organic: uniqueItems }
    }

    // Búsqueda simple
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

  /**
   * Verifica si una URL es de una fuente oficial colombiana
   */
  private isOfficialSource(url: string, title?: string): boolean {
    const urlLower = url.toLowerCase()
    const titleLower = (title || "").toLowerCase()
    
    const officialPatterns = [
      'corteconstitucional.gov.co',
      'consejodeestado.gov.co',
      'superfinanciera.gov.co',
      'superintendencia financiera',
      'dian.gov.co',
      'imprenta.gov.co',
      'diario oficial',
      'ministerio',
      'gov.co',
      'suin-juriscol',
      'ramajudicial.gov.co',
      'fiscalia.gov.co',
      'procuraduria.gov.co'
    ]
    
    return officialPatterns.some(pattern => 
      urlLower.includes(pattern) || titleLower.includes(pattern)
    )
  }

  /**
   * Evalúa la completitud de la información recopilada
   */
  private async evaluateCompleteness(
    userQuery: string,
    collectedSources: Array<{ title: string; url: string }>,
    allMessages: any[]
  ): Promise<{ needsMore: boolean; gaps: string[]; refinedQueries: string[] }> {
    const uniqueSources = this.uniqueByUrl(collectedSources)
    const officialSources = uniqueSources.filter(s => this.isOfficialSource(s.url, s.title))
    
    console.log(`\n🔍 Evaluando completitud de investigación...`)
    console.log(`   - Fuentes totales: ${uniqueSources.length}`)
    console.log(`   - Fuentes oficiales: ${officialSources.length}`)
    
    // Crear prompt para evaluación
    const evaluationPrompt = `Eres un evaluador experto de investigaciones legales colombianas.

PREGUNTA DEL USUARIO: "${userQuery}"

FUENTES ENCONTRADAS (${uniqueSources.length} totales, ${officialSources.length} oficiales):
${uniqueSources.slice(0, 10).map((s, i) => `${i + 1}. ${s.title} - ${s.url} ${this.isOfficialSource(s.url, s.title) ? '[OFICIAL]' : ''}`).join('\n')}

EVALÚA:
1. ¿La información recopilada es suficiente para responder completamente la pregunta?
2. ¿Qué aspectos específicos de la pregunta aún no están cubiertos o necesitan más profundización?
3. ¿Qué queries de búsqueda adicionales generarías para completar la información faltante?

Responde SOLO en formato JSON:
{
  "completa": true/false,
  "razon": "breve explicación de por qué es completa o incompleta",
  "gaps": ["aspecto 1 que falta", "aspecto 2 que falta"],
  "queries_refinadas": ["query 1 específica", "query 2 específica", "query 3 específica"]
}

IMPORTANTE: 
- Si tienes menos de ${this.config.minSourcesForCompletion} fuentes o ninguna fuente oficial, la investigación NO está completa
- Las queries refinadas deben ser específicas y enfocadas en los gaps identificados
- Prioriza fuentes oficiales colombianas (Superintendencia Financiera, DIAN, Corte Constitucional, etc.)`

    try {
      const evaluationResponse = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          { role: "system", content: "Eres un evaluador experto. Responde SOLO con JSON válido, sin texto adicional." },
          { role: "user", content: evaluationPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800
        // Removido response_format porque Tongyi no lo soporta bien
      })

      const evaluationText = evaluationResponse.choices[0]?.message?.content || "{}"
      
      // Intentar extraer JSON de la respuesta (puede estar envuelto en texto)
      let evaluation: any = {}
      try {
        // Primero intentar parsear directamente
        evaluation = JSON.parse(evaluationText)
      } catch {
        // Si falla, intentar extraer JSON de bloques de código
        const jsonMatch = evaluationText.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          try {
            evaluation = JSON.parse(jsonMatch[1])
          } catch {
            // Intentar extraer JSON directo del texto
            const directJsonMatch = evaluationText.match(/\{[\s\S]*\}/)
            if (directJsonMatch) {
              try {
                evaluation = JSON.parse(directJsonMatch[0])
              } catch {
                console.log(`⚠️ No se pudo parsear JSON de evaluación, usando heurísticas`)
              }
            }
          }
        }
      }

      // Usar heurísticas si no se pudo parsear
      const hasEnoughSources = uniqueSources.length >= (this.config.minSourcesForCompletion || 3)
      const hasOfficialSources = officialSources.length >= 2
      
      const needsMore = evaluation.completa === false || 
                       (!evaluation.completa && !hasEnoughSources) ||
                       (this.config.requireOfficialSources && !hasOfficialSources)

      console.log(`   - ¿Necesita más información?: ${needsMore ? 'SÍ' : 'NO'}`)
      if (evaluation.gaps && evaluation.gaps.length > 0) {
        console.log(`   - Gaps identificados: ${evaluation.gaps.join(', ')}`)
      }

      return {
        needsMore,
        gaps: evaluation.gaps || [],
        refinedQueries: evaluation.queries_refinadas || []
      }
    } catch (error) {
      console.error(`❌ Error en evaluación de completitud:`, error)
      // Fallback basado en heurísticas
      const hasEnoughSources = uniqueSources.length >= (this.config.minSourcesForCompletion || 3)
      const hasOfficialSources = officialSources.length >= 2
      const needsMore = !hasEnoughSources || (this.config.requireOfficialSources && !hasOfficialSources)
      
      return {
        needsMore,
        gaps: needsMore ? ["Información adicional necesaria"] : [],
        refinedQueries: needsMore ? [`${userQuery} Colombia fuente oficial`, `${userQuery} Colombia normatividad`] : []
      }
    }
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

    // Sistema de Sequential Thinking para Deep Research
    const system = `Eres un Agente de Investigación Legal Colombiano con capacidades de Deep Research y Sequential Thinking especializado en derecho colombiano.

🧠 METODOLOGÍA DE SEQUENTIAL THINKING:

PASO 1: ANÁLISIS INICIAL
- Analiza la pregunta del usuario y descomponela en componentes clave
- Identifica qué información específica se necesita (definición, regulación, tributación, jurisprudencia, etc.)
- Determina qué fuentes oficiales colombianas son más relevantes

PASO 2: PLANIFICACIÓN DE INVESTIGACIÓN
- Genera un plan estratégico de búsqueda
- Identifica múltiples ángulos de investigación necesarios
- Prioriza búsquedas en fuentes oficiales (Superintendencia Financiera, DIAN, Corte Constitucional, etc.)

PASO 3: EJECUCIÓN ITERATIVA
- Realiza búsquedas iniciales amplias
- Analiza resultados y identifica gaps de información
- Ejecuta búsquedas refinadas específicas para cubrir gaps
- Verifica consistencia entre múltiples fuentes

PASO 4: EVALUACIÓN DE COMPLETITUD
- Evalúa si tienes suficiente información para responder completamente
- Identifica qué aspectos aún necesitan profundización
- Decide si necesitas más rondas de búsqueda o puedes sintetizar

PASO 5: SÍNTESIS FINAL
- Combina información de todas las fuentes encontradas
- Verifica consistencia y elimina contradicciones
- Genera respuesta estructurada, completa y precisa

POLÍTICA DE FUENTES:
- SIEMPRE prioriza fuentes oficiales (Corte Constitucional, Consejo de Estado, SUIN, Diario Oficial, ministerios, superintendencias)
- NUNCA inventes números de artículos o leyes que no aparezcan explícitamente en las fuentes
- Verifica consistencia entre múltiples fuentes antes de responder

POLÍTICA DE ITERACIÓN:
- NO te detengas después de una sola búsqueda si la información es incompleta
- Evalúa SIEMPRE si necesitas más información antes de responder
- Usa queries específicas y refinadas en rondas posteriores
- Prioriza búsquedas en fuentes oficiales si no las has encontrado aún

RESPUESTA FINAL:
- Responde DIRECTAMENTE con la información encontrada, sin mostrar tu proceso de razonamiento
- NO incluyas frases como "Hmm", "Analizando", "Revisando", "Necesito verificar", "Voy a buscar"
- NO muestres tu thinking interno o pasos de análisis en la respuesta final
- Presenta la respuesta final de forma directa y profesional
- Explicación clara, concisa, con contexto colombiano
- No incluyas la bibliografía dentro del texto; solo el contenido. Las fuentes se enviarán por separado

FORMATO DE RESPUESTA:
- Empieza directamente con la respuesta a la pregunta del usuario
- Usa lenguaje profesional y técnico apropiado para consultas legales
- Estructura tu respuesta de manera clara con secciones si es necesario, pero sin mostrar tu proceso mental`

    // RONDA 1: Búsqueda inicial con sequential thinking
    console.log(`\n🔬 DEEP RESEARCH - RONDA 1: Análisis inicial y búsqueda base`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`${'='.repeat(80)}`)
    
    // Prompt inicial que guía al sequential thinking
    const initialPrompt = `${userQuery}

🧠 INSTRUCCIONES PARA SEQUENTIAL THINKING:
1. ANALIZA la pregunta: ¿Qué información específica necesitas? ¿Qué aspectos legales aplican?
2. PLANIFICA tu investigación: ¿Qué queries de búsqueda necesitas? ¿Qué fuentes oficiales colombianas son relevantes?
3. EJECUTA búsquedas estratégicas usando serper_search con queries optimizadas para fuentes oficiales colombianas

IMPORTANTE: Usa serper_search con queries que incluyan términos como "Superintendencia Financiera", "DIAN", "Corte Constitucional", "Colombia" junto con el tema de la pregunta.`

    // 1ª llamada: el modelo decide herramientas con sequential thinking
    const first = await this.client.chat.completions.create({
      model: this.config.model!,
      messages: [
        { role: "system", content: system },
        { role: "user", content: initialPrompt }
      ],
      tools,
      tool_choice: "auto",
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    })

    let messages: any[] = [
      { role: "system", content: system },
      { role: "user", content: initialPrompt },
      first.choices[0].message,
    ]

    // Ejecutar tools si fueron llamadas
    const toolCalls = first.choices[0].message?.tool_calls || []
    const collectedSources: Array<{ title: string; url: string }> = []

    for (const call of toolCalls) {
      const { name, arguments: args } = call.function
      let parsed: any
      
      try {
        parsed = JSON.parse(args || "{}")
      } catch (e) {
        console.error(`❌ Error parseando argumentos de ${name}:`, e)
        messages.push({ role: "tool", tool_call_id: call.id, name, content: `ERROR: No se pudieron parsear los argumentos JSON` })
        continue
      }
      
      try {
        if (name === "serper_search") {
          // Manejar tanto string como array
          const queryParam = parsed.query
          const query = Array.isArray(queryParam) ? queryParam : (typeof queryParam === 'string' ? queryParam : String(queryParam))
          
          if (Array.isArray(queryParam)) {
            console.log(`📋 ResearchToolsAgent: Query recibida como array con ${queryParam.length} elementos`)
          }
          
          const data = await this.serperSearch(query)
          const rawSources = this.extractSourcesFromSerper(data)
          const uniq = this.uniqueByUrl(rawSources)
          collectedSources.push(...uniq)
          
          // Formatear resultados para el modelo con indicador de fuentes oficiales
          const formattedResults = uniq.map(s => {
            const official = this.isOfficialSource(s.url, s.title) ? ' [OFICIAL]' : ''
            return `${s.title}${official} - ${s.url}`
          }).join('\n')
          messages.push({ role: "tool", tool_call_id: call.id, name, content: `Encontradas ${uniq.length} fuentes:\n${formattedResults}` })
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
        console.error(`❌ Error ejecutando ${name}:`, e)
        messages.push({ role: "tool", tool_call_id: call.id, name, content: `ERROR: ${e instanceof Error ? e.message : "desconocido"}` })
      }
    }

    console.log(`✅ Ronda 1 completada: ${collectedSources.length} fuentes recopiladas`)
    
    // SISTEMA DE ITERACIÓN: Evaluar y buscar más información si es necesario
    let searchRound = 1
    const maxRounds = this.config.maxRounds || 5
    let needsMoreInfo = true

    while (needsMoreInfo && searchRound < maxRounds) {
      console.log(`\n🔄 RONDA ${searchRound + 1}: Evaluación y búsqueda iterativa`)
      
      // Evaluar completitud
      const evaluation = await this.evaluateCompleteness(userQuery, collectedSources, messages)
      
      if (!evaluation.needsMore || evaluation.refinedQueries.length === 0) {
        console.log(`✅ Información suficiente después de ${searchRound} ronda(s)`)
        needsMoreInfo = false
        break
      }

      console.log(`🔍 Necesita más información. Ejecutando ${evaluation.refinedQueries.length} búsqueda(s) refinada(s)...`)
      
      // Ejecutar búsquedas refinadas
      const refinedQueries = evaluation.refinedQueries.slice(0, 3) // Máximo 3 queries por ronda
      
      for (const refinedQuery of refinedQueries) {
        try {
          console.log(`   🔎 Buscando: "${refinedQuery}"`)
          const data = await this.serperSearch(refinedQuery)
          const rawSources = this.extractSourcesFromSerper(data)
          const uniq = this.uniqueByUrl(rawSources)
          
          // Solo agregar fuentes nuevas (no duplicadas)
          const existingUrls = new Set(collectedSources.map(s => s.url.toLowerCase()))
          const newSources = uniq.filter(s => !existingUrls.has(s.url.toLowerCase()))
          collectedSources.push(...newSources)
          
          if (newSources.length > 0) {
            const formattedResults = newSources.map(s => {
              const official = this.isOfficialSource(s.url, s.title) ? ' [OFICIAL]' : ''
              return `${s.title}${official} - ${s.url}`
            }).join('\n')
            
            // Simular tool call para mantener consistencia con el formato
            messages.push({
              role: "user",
              content: `Busca más información sobre: ${refinedQuery}`
            })
            messages.push({
              role: "assistant",
              content: `Ejecutando búsqueda refinada...`,
              tool_calls: [{
                id: `refined-${searchRound}-${Date.now()}`,
                type: "function",
                function: { name: "serper_search", arguments: JSON.stringify({ query: refinedQuery }) }
              }]
            })
            messages.push({
              role: "tool",
              tool_call_id: `refined-${searchRound}-${Date.now()}`,
              name: "serper_search",
              content: `Encontradas ${newSources.length} fuentes nuevas:\n${formattedResults}`
            })
          }
        } catch (e) {
          console.error(`❌ Error en búsqueda refinada "${refinedQuery}":`, e)
        }
      }
      
      searchRound++
      
      // Re-evaluar después de nuevas búsquedas
      const reEvaluation = await this.evaluateCompleteness(userQuery, collectedSources, messages)
      needsMoreInfo = reEvaluation.needsMore && searchRound < maxRounds
      
      if (!needsMoreInfo) {
        console.log(`✅ Información suficiente después de ${searchRound} ronda(s)`)
      }
    }

    console.log(`\n📊 Investigación completada: ${searchRound} ronda(s), ${collectedSources.length} fuentes totales`)

    // SÍNTESIS FINAL: Combinar información de todas las rondas
    console.log(`\n📝 Generando síntesis final con información de ${searchRound} ronda(s)...`)
    try {
      // Contar fuentes oficiales
      const unique = this.uniqueByUrl(collectedSources)
      const officialSources = unique.filter(s => this.isOfficialSource(s.url, s.title))
      
      // Agregar prompt explícito para síntesis usando toda la información recopilada
      const finalMessages = [
        ...messages.filter(m => m.role !== 'user' || !m.content.includes('INSTRUCCIONES PARA SEQUENTIAL THINKING')),
        {
          role: "user" as const,
          content: `SINTETIZA la respuesta final usando TODA la información recopilada en las ${searchRound} ronda(s) de investigación.

INFORMACIÓN RECOPILADA:
- Total de fuentes: ${unique.length}
- Fuentes oficiales: ${officialSources.length}
- Rondas de investigación: ${searchRound}

REGLAS PARA LA SÍNTESIS FINAL:
1. Combina información de TODAS las fuentes encontradas en todas las rondas
2. Prioriza información de fuentes oficiales colombianas
3. Verifica consistencia entre múltiples fuentes
4. Responde DIRECTAMENTE sin mostrar tu proceso de razonamiento
5. NO incluyas frases como "Hmm", "Analizando", "Revisando", "Necesito verificar"
6. NO muestres tu thinking interno o pasos de análisis
7. Presenta la respuesta de forma directa, profesional y completa
8. NUNCA inventes números de artículos o leyes que no aparezcan explícitamente en las fuentes

ESTRUCTURA DE RESPUESTA:
- Respuesta directa a la pregunta del usuario
- Marco normativo (si se encontró información)
- Tratamiento específico (tributario, regulatorio, jurídico, etc.)
- Contexto colombiano relevante

Responde ahora con la información completa recopilada.`
        }
      ]
      
      const final = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: finalMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })

      let text = final.choices[0]?.message?.content || ""
      
      // Filtrar thinking del texto final
      if (text) {
        // Eliminar frases comunes de thinking al inicio
        const thinkingPatterns = [
          /^Hmm[,\.]?\s*/i,
          /^Veo que\s*/i,
          /^Analizando\s+/i,
          /^Revisando\s+/i,
          /^Necesito verificar\s+/i,
          /^Voy a buscar\s+/i,
          /^El usuario pregunta\s+/i,
          /^Analizando los documentos:\s*/i,
          /^Revisando los resultados\s+/i,
          /^Necesito verificar específicamente\s+/i
        ]
        
        for (const pattern of thinkingPatterns) {
          text = text.replace(pattern, '')
        }
        
        // Si el texto empieza con razonamiento largo, buscar dónde empieza la respuesta real
        const reasoningStartPatterns = [
          /^Hmm[^\.]*\.\s*/,
          /^Veo que[^\.]*\.\s*/,
          /^Analizando[^\.]*\.\s*/,
          /^Revisando[^\.]*\.\s*/
        ]
        
        for (const pattern of reasoningStartPatterns) {
          const match = text.match(pattern)
          if (match && match[0].length > 20) {
            // Si hay mucho razonamiento, buscar la primera frase que no sea thinking
            const afterMatch = text.substring(match[0].length)
            const firstSentence = afterMatch.split(/[\.\n]/)[0]
            if (firstSentence.length > 30 && !firstSentence.match(/^Necesito|^Voy a|^Analizando|^Revisando/i)) {
              text = afterMatch.trim()
            }
          }
        }
        
        text = text.trim()
      }
      
      // Si no hay respuesta válida, generar fallback con las fuentes
      if (!text || text.trim().length === 0 || text === "No se pudo generar respuesta.") {
        console.warn(`⚠️ ResearchToolsAgent: Respuesta vacía, generando fallback`)
        const sourcesSummary = collectedSources
          .slice(0, 10)
          .map((s, i) => `${i + 1}. ${s.title} - ${s.url}`)
          .join('\n')
        text = `He encontrado ${collectedSources.length} fuentes relevantes sobre tu consulta:\n\n${sourcesSummary}\n\nPor favor, reformula tu pregunta si necesitas información más específica.`
      }
      
      const uniqueFinal = this.uniqueByUrl(collectedSources)
      
      console.log(`✅ ResearchToolsAgent: Respuesta generada (${text.length} caracteres, ${uniqueFinal.length} fuentes)`)
      
      return {
        text,
        sources: uniqueFinal.map((s, i) => ({ id: `src-${i + 1}`, title: s.title, url: s.url }))
      }
    } catch (error) {
      console.error(`❌ Error en síntesis final de ResearchToolsAgent:`, error)
      
      // Fallback: devolver resumen de fuentes encontradas
      const uniqueFinal = this.uniqueByUrl(collectedSources)
      return {
        text: collectedSources.length > 0
          ? `He encontrado ${uniqueFinal.length} fuentes relevantes. Sin embargo, hubo un error al generar la respuesta completa. Por favor, intenta reformular tu pregunta.`
          : "Lo siento, hubo un error procesando tu consulta. Por favor, intenta más tarde.",
        sources: uniqueFinal.map((s, i) => ({ id: `src-${i + 1}`, title: s.title, url: s.url }))
      }
    }
  }
}


