/**
 * Tools Agent de Búsqueda Web - Usando Serper API
 * Implementa tool calling con Serper para búsqueda web
 */

import OpenAI from "openai"

export interface ToolsAgentConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ToolsAgentResponse {
  type: "answer"
  text: string
  sources: Array<{ title: string; url: string }>
}

export class WebSearchToolsAgent {
  private client: OpenAI
  private config: ToolsAgentConfig

  constructor(config: ToolsAgentConfig) {
    this.config = {
      model: "alibaba/tongyi-deepresearch-30b-a3b",
      temperature: 0.1,
      maxTokens: 3000,
      ...config
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
  }

  /**
   * Ejecuta búsqueda con Serper API
   * Acepta string o array de strings para búsquedas múltiples
   */
  private async executeSerperSearch(query: string | string[]): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY

    if (!apiKey) {
      throw new Error("SERPER_API_KEY no configurada en variables de entorno")
    }

    // Si es array, ejecutar búsquedas en paralelo
    if (Array.isArray(query)) {
      console.log(`🔍 Serper Search (múltiple): ${query.length} queries`)
      console.log(`📝 Queries:`, query)
      
      try {
        // Ejecutar todas las búsquedas en paralelo
        const searchPromises = query.map(q => this.executeSingleSerperSearch(q.trim(), apiKey))
        const results = await Promise.allSettled(searchPromises)
        
        // Combinar resultados exitosos
        const allItems: any[] = []
        const allQueries: string[] = []
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.items) {
            allItems.push(...result.value.items)
            allQueries.push(query[index])
          } else {
            console.warn(`⚠️ Búsqueda ${index + 1} falló:`, result.status === 'rejected' ? result.reason : 'sin resultados')
            allQueries.push(query[index])
          }
        })
        
        // Eliminar duplicados por URL
        const uniqueItems = Array.from(
          new Map(allItems.map(item => [item.link, item])).values()
        )
        
        console.log(`✅ Serper (múltiple): ${uniqueItems.length} resultados únicos de ${allItems.length} totales`)
        
        // Formatear resultados combinados
        const formattedResults = uniqueItems.slice(0, 15).map((item: any, index: number) => 
          `${index + 1}. **${item.title}**\n   ${item.snippet}\n   🔗 ${item.link}`
        ).join('\n\n')
        
        return `🔍 **Búsqueda Serper completada (múltiples queries)**\n\nQueries: ${allQueries.map(q => `"${q}"`).join(', ')}\nResultados únicos encontrados: ${uniqueItems.length}\n\n${formattedResults}`
      } catch (error) {
        console.error(`❌ Error en búsqueda múltiple Serper:`, error)
        return `❌ Error en búsqueda Serper múltiple: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
    
    // Búsqueda simple (string)
    return this.executeSingleSerperSearch(query, apiKey).then(result => result.formatted)
  }

  /**
   * Ejecuta una sola búsqueda con Serper API optimizada para fuentes colombianas
   */
  private async executeSingleSerperSearch(query: string, apiKey: string): Promise<{ items: any[], formatted: string }> {
    try {
      console.log(`🔍 Serper Search (optimizado Colombia): "${query}"`)
      
      // Optimizar query para fuentes colombianas si no incluye "Colombia"
      let optimizedQuery = query
      if (!query.toLowerCase().includes('colombia')) {
        optimizedQuery = `${query} Colombia`
      }
      
      // Priorizar sitios oficiales colombianos si la query es legal
      const isLegalQuery = /(derecho|legal|ley|decreto|sentencia|jurisprudencia|superintendencia|dian|corte|consejo|ministerio|regulación|tributación)/i.test(query)
      
      // Si es consulta legal, agregar términos de sitios oficiales
      if (isLegalQuery && !optimizedQuery.match(/(superintendencia|dian|corte|consejo|ministerio|gov\.co|\.co)/i)) {
        optimizedQuery = `${optimizedQuery} sitio:gov.co OR sitio:superfinanciera.gov.co OR sitio:dian.gov.co OR sitio:corteconstitucional.gov.co OR sitio:consejodeestado.gov.co`
      }

      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: optimizedQuery,
          num: 12, // Aumentado para más resultados
          gl: "co", // Colombia
          hl: "es", // Español
          // Priorizar resultados de sitios oficiales colombianos
          ...(isLegalQuery && {
            // Ordenar por relevancia con preferencia a sitios .gov.co
            sort: "relevance"
          })
        })
      })

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`)
      }

      const data = await response.json()
      const items = data.organic || []

      console.log(`✅ Serper: ${items.length} resultados encontrados`)

      // Formatear resultados
      const formattedResults = items.map((item: any, index: number) => 
        `${index + 1}. **${item.title}**\n   ${item.snippet}\n   🔗 ${item.link}`
      ).join('\n\n')

      const formatted = `🔍 **Búsqueda Serper completada**\n\nQuery: "${query}"\nResultados encontrados: ${items.length}\n\n${formattedResults}`

      return { items, formatted }

    } catch (error) {
      console.error(`❌ Error en Serper:`, error)
      return {
        items: [],
        formatted: `❌ Error en búsqueda Serper: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Procesa una consulta del usuario usando tool calling nativo (patrón n8n)
   */
  async processQuery(userQuery: string): Promise<ToolsAgentResponse> {
    console.log(`\n🤖 TOOLS AGENT - PROCESANDO CONSULTA`)
    console.log(`📝 Query: "${userQuery}"`)
    console.log(`🔧 Herramientas: serper_search (Tool Calling Nativo)`)
    console.log(`${'='.repeat(80)}`)

    try {
      // Definir herramienta serper_search con descripción optimizada para fuentes colombianas
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "serper_search",
            description: "OBLIGATORIO: Busca información legal en la web enfocada en fuentes colombianas oficiales. Esta herramienta te da acceso a información actualizada de fuentes oficiales colombianas (Superintendencia Financiera, DIAN, Corte Constitucional, Consejo de Estado, SUIN, ministerios, etc.). SIEMPRE debes usar esta herramienta para consultas legales colombianas, incluso si crees conocer la respuesta.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Query de búsqueda optimizada para fuentes colombianas. Incluye 'Colombia' y términos legales relevantes. Ejemplos: 'cuentas en participación Colombia valor financiero Superintendencia Financiera', 'cuentas en participación Colombia tributación DIAN', 'cuentas en participación Colombia regulación'"
                }
              },
              required: ["query"]
            }
          }
        }
      ]

      // Prompt del sistema optimizado para FORZAR búsqueda web
      const systemPrompt = `Eres un Agente de Investigación Legal Colombiano. Tu meta es responder con precisión y trazabilidad jurídica usando SIEMPRE búsqueda web en fuentes oficiales colombianas.

REGLAS OBLIGATORIAS ABSOLUTAS:
1. SIEMPRE debes usar la herramienta serper_search para consultas legales colombianas
2. NUNCA respondas solo con tu conocimiento base - SIEMPRE busca información actualizada
3. La herramienta tiene acceso a fuentes oficiales colombianas actualizadas
4. Responde SOLO con la información encontrada en la búsqueda

PROHIBICIÓN ABSOLUTA DE INVENTAR ARTÍCULOS Y LEYES:
- NUNCA menciones números de artículos a menos que aparezcan EXPLÍCITAMENTE en los resultados de búsqueda
- NUNCA menciones números de leyes, decretos o resoluciones a menos que aparezcan EXPLÍCITAMENTE en los resultados de búsqueda
- Si los resultados de búsqueda mencionan artículos o leyes, cita exactamente como aparecen
- Si no encuentras información específica sobre artículos o leyes en la búsqueda, NO los inventes
- Si necesitas verificar información específica, usa la herramienta serper_search nuevamente con queries más específicas
- Ejemplo INCORRECTO: "artículo 21 de la Ley 181" (si no aparece en búsqueda)
- Ejemplo CORRECTO: "según la normatividad colombiana sobre el tema" o "de acuerdo con las fuentes oficiales consultadas"

POLÍTICA DE HERRAMIENTA - BÚSQUEDA ITERATIVA:
- SIEMPRE llama a serper_search ANTES de responder consultas legales
- Puedes llamar a serper_search MÚLTIPLES VECES para iterar y encontrar información completa
- Después de cada búsqueda, evalúa si necesitas más información y busca nuevamente si es necesario
- Optimiza tus queries para fuentes colombianas: incluye "Colombia" y términos como "Superintendencia Financiera", "DIAN", "Corte Constitucional", "Consejo de Estado"
- Usa múltiples queries para cubrir diferentes aspectos (regulación, tributación, jurisprudencia, normatividad)
- ESTRATEGIA ITERATIVA:
  * Primera ronda: búsqueda general sobre el concepto
  * Segunda ronda: búsqueda específica sobre regulación/definición legal
  * Tercera ronda: búsqueda sobre tratamiento tributario si aplica
  * Cuarta ronda: búsqueda sobre jurisprudencia si aplica
  * Continúa iterando hasta tener información completa y verificada
- Formato: {"query":"término legal Colombia fuente oficial"}

POLÍTICA DE RESPUESTA:
- Responde DIRECTAMENTE con la información encontrada, sin mostrar tu proceso de razonamiento.
- NO incluyas frases como "Hmm", "Veo que", "Analizando", "Revisando", "Necesito verificar", "Voy a buscar".
- NO muestres tu thinking interno, pasos de análisis o razonamiento paso a paso.
- Presenta la respuesta final de forma directa y profesional.
- Después de recibir resultados de búsqueda, responde directamente sin explicar lo que hiciste.

ESTRATEGIA DE BÚSQUEDA OPTIMIZADA PARA COLOMBIA:
- Prioriza fuentes oficiales: incluye en tus queries términos como "Superintendencia Financiera", "DIAN", "Corte Constitucional", "Consejo de Estado", "SUIN", "ministerio"
- Múltiples queries para cobertura completa:
  * Consulta sobre regulación: "término legal Colombia Superintendencia Financiera regulación"
  * Consulta sobre tributación: "término legal Colombia DIAN tributación impuestos"
  * Consulta sobre jurisprudencia: "término legal Colombia Corte Constitucional sentencia"
  * Consulta sobre normatividad: "término legal Colombia Código Comercio decreto"
- EJEMPLOS DE QUERIES OPTIMIZADAS:
  * "cuentas en participación Colombia Superintendencia Financiera valor financiero"
  * "cuentas en participación Colombia DIAN tributación impuestos"
  * "cuentas en participación Colombia regulación financiera"
  * "cuentas en participación Colombia Corte Constitucional jurisprudencia"
- ENFOQUE: Busca por conceptos legales generales con términos de fuentes oficiales colombianas

ESTRUCTURA DE RESPUESTA:
1. **Respuesta directa a la pregunta** (basada en búsquedas)
   - Responde la pregunta del usuario de forma clara y directa
   - Usa SOLO información encontrada en las búsquedas
   - NO inventes detalles específicos como números de artículos o leyes
   
2. **Marco normativo y regulación** (si se encontró información)
   - Menciona las entidades que regulan (Superintendencia Financiera, DIAN, etc.)
   - Solo menciona artículos o leyes si aparecieron EXPLÍCITAMENTE en las búsquedas
   
3. **Tratamiento específico** (si aplica)
   - Tributario, regulatorio, jurídico, etc.
   - Basado en información encontrada en búsquedas
   
4. **Fuentes consultadas**
   - Lista las fuentes oficiales encontradas
   - Incluye URLs para trazabilidad

IMPORTANTE: 
- NO respondas sin usar la herramienta serper_search
- ITERA las búsquedas hasta tener información completa y verificada
- SIEMPRE incluye las URLs de las fuentes en tu respuesta
- Si la búsqueda no encuentra información sobre artículos específicos, NO los inventes - di "según la normatividad colombiana" o similar
- VERIFICA toda la información antes de responder finalizando tus búsquedas`

      // Detectar si es una consulta legal que requiere búsqueda obligatoria
      const isLegalQuery = /(cómo|qué|cuándo|dónde|quién|por qué|son|es|tributan|regulación|normatividad|ley|decreto|sentencia|jurisprudencia|clasificación|naturaleza|definición|valor|financiero|legal|derecho|colombia)/i.test(userQuery)
      
      // Primera llamada al modelo - FORZAR uso de herramienta para consultas legales
      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: isLegalQuery 
              ? `${userQuery}\n\nIMPORTANTE: Esta es una consulta legal colombiana. DEBES usar la herramienta serper_search para buscar información actualizada en fuentes oficiales colombianas antes de responder.`
              : userQuery
          }
        ],
        tools,
        tool_choice: isLegalQuery ? "required" as const : "auto", // Forzar herramienta para consultas legales
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error("No se recibió respuesta del modelo")
      }

      console.log(`✅ Primera respuesta recibida`)
      console.log(`🔧 Tool calls: ${message.tool_calls?.length || 0}`)

      // Si el modelo llamó la herramienta
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`✅ Modelo decidió buscar - ejecutando ${message.tool_calls.length} herramienta(s)`)
        
        const toolResults = await Promise.all(
          message.tool_calls.map(async (toolCall) => {
            const { name, arguments: args } = toolCall.function
            let parsedArgs: any
            
            try {
              parsedArgs = JSON.parse(args)
            } catch (error) {
              console.error(`❌ Error parseando argumentos de ${name}:`, error)
              return {
                tool_call_id: toolCall.id,
                role: "tool" as const,
                name,
                content: `Error: No se pudieron parsear los argumentos JSON`
              }
            }
            
            console.log(`🔧 Ejecutando ${name}:`, parsedArgs)
            
            try {
              let result: string
              
              if (name === "serper_search") {
                // Manejar tanto string como array
                const queryParam = parsedArgs.query
                if (Array.isArray(queryParam)) {
                  console.log(`📋 Query recibida como array con ${queryParam.length} elementos`)
                  result = await this.executeSerperSearch(queryParam)
                } else if (typeof queryParam === 'string') {
                  result = await this.executeSerperSearch(queryParam)
                } else {
                  console.warn(`⚠️ Query en formato inesperado:`, typeof queryParam)
                  result = await this.executeSerperSearch(String(queryParam))
                }
              } else {
                result = `Herramienta ${name} no reconocida`
              }
              
              return {
                tool_call_id: toolCall.id,
                role: "tool" as const,
                name,
                content: result
              }
            } catch (error) {
              console.error(`❌ Error ejecutando ${name}:`, error)
              return {
                tool_call_id: toolCall.id,
                role: "tool" as const,
                name,
                content: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
              }
            }
          })
        )

        console.log(`✅ Herramientas ejecutadas: ${toolResults.length} resultados obtenidos`)
        
        // SISTEMA DE ITERACIÓN: Permitir múltiples rondas de búsqueda
        let allMessages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
          message,
          ...toolResults
        ]
        
        let searchRound = 1
        const maxSearchRounds = 5 // Máximo de rondas de búsqueda iterativa
        let hasMoreToSearch = true
        
        // Iterar búsquedas mientras el modelo determine que necesita más información
        while (hasMoreToSearch && searchRound < maxSearchRounds) {
          console.log(`\n🔄 RONDA ${searchRound + 1} DE BÚSQUEDA ITERATIVA`)
          
          // Pedir al modelo que evalúe si necesita más búsquedas
          const evaluationResponse = await this.client.chat.completions.create({
            model: this.config.model!,
            messages: [
              ...allMessages,
              {
                role: "user",
                content: `Evalúa si necesitas hacer búsquedas adicionales para completar la respuesta. Si necesitas más información sobre algún aspecto específico (regulación, tributación, jurisprudencia), usa serper_search nuevamente. Si ya tienes suficiente información, responde directamente a la pregunta del usuario sin más búsquedas.`
              }
            ],
            tools,
            tool_choice: "auto", // El modelo decide si necesita más búsquedas
            temperature: this.config.temperature,
            max_tokens: 500 // Respuesta corta para evaluación
          })
          
          const evaluationMessage = evaluationResponse.choices[0]?.message
          
          // Si el modelo decide hacer más búsquedas
          if (evaluationMessage?.tool_calls && evaluationMessage.tool_calls.length > 0) {
            console.log(`🔍 Modelo decidió hacer ${evaluationMessage.tool_calls.length} búsqueda(s) adicional(es)`)
            
            // Ejecutar las búsquedas adicionales
            const additionalToolResults = await Promise.all(
              evaluationMessage.tool_calls.map(async (toolCall) => {
                const { name, arguments: args } = toolCall.function
                let parsedArgs: any
                
                try {
                  parsedArgs = JSON.parse(args)
                } catch (error) {
                  console.error(`❌ Error parseando argumentos de ${name}:`, error)
                  return {
                    tool_call_id: toolCall.id,
                    role: "tool" as const,
                    name,
                    content: `Error: No se pudieron parsear los argumentos JSON`
                  }
                }
                
                console.log(`🔧 Ejecutando búsqueda adicional ${name}:`, parsedArgs)
                
                try {
                  let result: string
                  
                  if (name === "serper_search") {
                    const queryParam = parsedArgs.query
                    if (Array.isArray(queryParam)) {
                      result = await this.executeSerperSearch(queryParam)
                    } else if (typeof queryParam === 'string') {
                      result = await this.executeSerperSearch(queryParam)
                    } else {
                      result = await this.executeSerperSearch(String(queryParam))
                    }
                  } else {
                    result = `Herramienta ${name} no reconocida`
                  }
                  
                  return {
                    tool_call_id: toolCall.id,
                    role: "tool" as const,
                    name,
                    content: result
                  }
                } catch (error) {
                  console.error(`❌ Error ejecutando ${name}:`, error)
                  return {
                    tool_call_id: toolCall.id,
                    role: "tool" as const,
                    name,
                    content: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
                  }
                }
              })
            )
            
            // Agregar resultados adicionales al contexto
            allMessages.push(evaluationMessage, ...additionalToolResults)
            toolResults.push(...additionalToolResults)
            searchRound++
          } else {
            // El modelo decidió que tiene suficiente información
            console.log(`✅ Modelo determinó que tiene suficiente información después de ${searchRound} ronda(s)`)
            hasMoreToSearch = false
          }
        }
        
        // Extraer fuentes directamente de todos los resultados de búsqueda (todas las rondas)
        const collectedSources: Array<{ title: string; url: string }> = []
        
        toolResults.forEach((tr) => {
          if (tr.name === 'serper_search' && tr.content) {
            // Extraer URLs y títulos del contenido formateado de Serper
            // Patrón: número. **Título**\n   snippet\n   🔗 URL
            const lines = tr.content.split('\n')
            let currentTitle = ""
            let currentUrl = ""
            let sourcesFromThisResult = 0
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]
              
              // Buscar título en formato **Título**
              const titleMatch = line.match(/\*\*([^*]+)\*\*/)
              if (titleMatch) {
                currentTitle = titleMatch[1].trim()
              }
              
              // Buscar URL con emoji 🔗
              const urlMatch = line.match(/🔗\s*(https?:\/\/[^\s\n\)]+)/)
              if (urlMatch) {
                currentUrl = urlMatch[1].trim()
                
                // Si tenemos ambos, agregar a fuentes
                if (currentTitle && currentUrl) {
                  collectedSources.push({
                    title: currentTitle,
                    url: currentUrl
                  })
                  sourcesFromThisResult++
                  currentTitle = ""
                  currentUrl = ""
                }
              }
              
              // También buscar URLs sin emoji pero con título previo
              if (currentTitle && !currentUrl) {
                const plainUrlMatch = line.match(/(https?:\/\/[^\s\n\)]+)/)
                if (plainUrlMatch) {
                  currentUrl = plainUrlMatch[1].trim()
                  collectedSources.push({
                    title: currentTitle,
                    url: currentUrl
                  })
                  sourcesFromThisResult++
                  currentTitle = ""
                  currentUrl = ""
                }
              }
            }
            
            console.log(`📚 Fuentes extraídas de ${tr.name}: ${sourcesFromThisResult} (total acumulado: ${collectedSources.length})`)
          }
        })
        
        // Eliminar duplicados de fuentes
        const uniqueSources = Array.from(
          new Map(collectedSources.map(s => [s.url, s])).values()
        )
        console.log(`📚 Fuentes extraídas de búsquedas: ${uniqueSources.length}`)
        
        // Verificar que tenemos resultados válidos
        const validResults = toolResults.filter(tr => tr.content && !tr.content.includes('Error:'))
        if (validResults.length === 0) {
          console.warn(`⚠️ Todas las herramientas fallaron, generando respuesta de fallback`)
          return {
            type: "answer",
            text: "Lo siento, hubo un error al ejecutar las búsquedas. Por favor, intenta reformular tu pregunta o inténtalo más tarde.",
            sources: []
          }
        }

        // Segunda llamada con todos los resultados de búsqueda (después de iteración)
        console.log(`🤖 Generando respuesta final con ${validResults.length} resultados válidos de ${searchRound} ronda(s) de búsqueda...`)
        
        try {
          // Agregar prompt explícito para respuesta final sin thinking y con verificación
          const finalMessages = [
            ...allMessages.filter((m: any) => m.role !== 'user' || !m.content.includes('Evalúa si necesitas')),
            {
              role: "user" as const,
              content: `Responde directamente a la pregunta del usuario con la información encontrada en todas las búsquedas realizadas. 

REGLAS CRÍTICAS:
- NO muestres tu proceso de razonamiento, thinking, o pasos de análisis
- Presenta la respuesta final de forma directa y profesional
- NUNCA menciones números de artículos o leyes que NO aparecieron EXPLÍCITAMENTE en los resultados de búsqueda
- Si los resultados mencionan artículos o leyes específicas, cítalas exactamente como aparecen
- Si no encontraste información específica sobre artículos, di "según la normatividad colombiana" o similar
- Estructura tu respuesta según el formato especificado: respuesta directa, marco normativo, tratamiento específico, fuentes`
            }
          ]
          
          const finalResponse = await this.client.chat.completions.create({
            model: this.config.model!,
            messages: finalMessages,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens
          })

          const finalMessage = finalResponse.choices[0]?.message
          let finalText = finalMessage?.content || ""
          
          // Filtrar thinking del texto final
          if (finalText) {
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
              finalText = finalText.replace(pattern, '')
            }
            
            // Si el texto empieza con razonamiento largo, buscar dónde empieza la respuesta real
            const reasoningStartPatterns = [
              /^Hmm[^\.]*\.\s*/,
              /^Veo que[^\.]*\.\s*/,
              /^Analizando[^\.]*\.\s*/,
              /^Revisando[^\.]*\.\s*/
            ]
            
            for (const pattern of reasoningStartPatterns) {
              const match = finalText.match(pattern)
              if (match && match[0].length > 20) {
                // Si hay mucho razonamiento, buscar la primera frase que no sea thinking
                const afterMatch = finalText.substring(match[0].length)
                const firstSentence = afterMatch.split(/[\.\n]/)[0]
                if (firstSentence.length > 30 && !firstSentence.match(/^Necesito|^Voy a|^Analizando|^Revisando/i)) {
                  finalText = afterMatch.trim()
                }
              }
            }
            
            finalText = finalText.trim()
          }
          
          // Si no hay respuesta, generar una con los resultados de búsqueda
          if (!finalText || finalText.trim().length === 0 || finalText === "No se pudo generar una respuesta.") {
            console.warn(`⚠️ Respuesta vacía del modelo, generando respuesta de fallback`)
            const searchContent = validResults
              .map(tr => tr.content)
              .join('\n\n')
            finalText = `Basándome en la información encontrada:\n\n${searchContent.substring(0, 2000)}...\n\nPor favor, reformula tu pregunta si necesitas información más específica.`
          }
          
          console.log(`📊 Respuesta final con búsqueda: ${finalText.substring(0, 150)}...`)
          console.log(`📏 Longitud de respuesta: ${finalText.length} caracteres`)
          
          // Limpiar texto de respuesta
          const cleanedText = this.cleanResponseText(finalText)
          
          // Combinar fuentes extraídas de búsquedas con fuentes del texto
          // Priorizar fuentes de búsquedas ya que son más confiables
          const textSources = this.extractSourcesFromText(finalText)
          
          // Combinar: primero fuentes de búsqueda (más confiables), luego del texto
          const allSourcesMap = new Map<string, { title: string; url: string }>()
          
          // Agregar fuentes de búsqueda primero (tienen prioridad)
          uniqueSources.forEach(source => {
            allSourcesMap.set(source.url.toLowerCase(), source)
          })
          
          // Agregar fuentes del texto (si no están ya en el mapa)
          textSources.forEach(source => {
            const key = source.url.toLowerCase()
            if (!allSourcesMap.has(key)) {
              allSourcesMap.set(key, source)
            }
          })
          
          const allSources = Array.from(allSourcesMap.values())
          
          console.log(`✅ Respuesta procesada: ${cleanedText.length} caracteres, ${allSources.length} fuentes totales (${uniqueSources.length} de búsquedas, ${textSources.length} del texto)`)
          
          return {
            type: "answer",
            text: cleanedText || finalText, // Usar texto limpio o original si la limpieza falla
            sources: allSources
          }
        } catch (error) {
          console.error(`❌ Error en síntesis final:`, error)
          
          // Fallback: usar los resultados de búsqueda directamente
          const searchSummary = validResults
            .map(tr => {
              const content = tr.content.substring(0, 500)
              return content.replace(/🔍 \*\*Búsqueda Serper completada\*\*/g, '').trim()
            })
            .filter(Boolean)
            .join('\n\n')
          
          // Usar fuentes ya extraídas si las hay, sino extraer del resumen
          const fallbackSources = uniqueSources.length > 0 
            ? uniqueSources 
            : this.extractSourcesFromText(searchSummary)
          
          return {
            type: "answer",
            text: `He encontrado la siguiente información sobre tu consulta:\n\n${searchSummary}\n\nSi necesitas información más específica, por favor reformula tu pregunta.`,
            sources: fallbackSources
          }
        }
      }

      // Si el modelo NO llamó la herramienta pero menciona argumentos, detectar y ejecutar búsqueda
      const text = message.content || ""
      
      // Detectar si el modelo está devolviendo argumentos en lugar de ejecutar la herramienta
      if (text.includes('"arguments"') && text.includes('"query"')) {
        console.log(`🔧 Detectado: Modelo devolvió argumentos en lugar de ejecutar herramienta`)
        
        try {
          // Extraer query del texto de respuesta - múltiples patrones
          let searchQuery = ""
          
          // Patrón 1: "query": ["texto"]
          const queryMatch1 = text.match(/"query":\s*\["([^"]+)"/)
          if (queryMatch1) {
            searchQuery = queryMatch1[1]
          }
          
          // Patrón 2: "query": "texto"
          if (!searchQuery) {
            const queryMatch2 = text.match(/"query":\s*"([^"]+)"/)
            if (queryMatch2) {
              searchQuery = queryMatch2[1]
            }
          }
          
          // Patrón 3: Buscar cualquier texto entre comillas después de "query"
          if (!searchQuery) {
            const queryMatch3 = text.match(/"query":\s*\["([^"]+)"[,\]]/)
            if (queryMatch3) {
              searchQuery = queryMatch3[1]
            }
          }
          
          if (searchQuery) {
            console.log(`🔍 Ejecutando búsqueda con query extraída: "${searchQuery}"`)
            
            // Ejecutar búsqueda directamente
            const searchResults = await this.executeSerperSearch(searchQuery)
            
            // Generar respuesta final con los resultados
            const finalResponse = await this.client.chat.completions.create({
              model: this.config.model!,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userQuery },
                { role: "assistant", content: "Buscaré información sobre tu consulta." },
                { role: "user", content: `Aquí están los resultados de búsqueda:\n${searchResults}` }
              ],
              temperature: this.config.temperature,
              max_tokens: this.config.maxTokens
            })

            const finalText = finalResponse.choices[0]?.message?.content || "No se pudo generar una respuesta."
            
            console.log(`📊 Respuesta final con búsqueda: ${finalText.substring(0, 100)}...`)
            
            // Limpiar texto de respuesta y extraer fuentes
            const cleanedText = this.cleanResponseText(finalText)
            const sources = this.extractSourcesFromText(finalText)
            
            return {
              type: "answer",
              text: cleanedText,
              sources
            }
          } else {
            console.log(`⚠️ No se pudo extraer query de los argumentos: ${text.substring(0, 200)}`)
          }
        } catch (error) {
          console.error(`❌ Error procesando argumentos:`, error)
        }
      }
      
      console.log(`📊 Respuesta directa (sin búsqueda): ${text.substring(0, 100)}...`)
      
      return {
        type: "answer",
        text,
        sources: []
      }

    } catch (error) {
      console.error(`❌ Error en Tools Agent:`, error)
      
      return {
        type: "answer",
        text: "Lo siento, hubo un error procesando tu consulta. Por favor, intenta reformular tu pregunta.",
        sources: []
      }
    }
  }


  /**
   * Limpia el texto de respuesta separando contenido principal de bibliografía
   * Versión mejorada: solo separa al final, no corta contenido útil
   */
  private cleanResponseText(text: string): string {
    if (!text || text.trim().length === 0) {
      return text
    }

    console.log(`🧹 Limpiando texto de respuesta (${text.length} caracteres)...`)

    // Caso especial: Si el texto EMPIEZA directamente con "Fuentes consultadas" sin contenido previo
    const bibliographyStartPatterns = [
      /^Fuentes consultadas\s*\d*\s*referencias?\s*$/i,
      /^Bibliografía\s*-\s*Fuentes Oficiales Colombianas\s*\d*\s*fuentes?\s*$/i,
      /^Fuentes:\s*\d*\s*referencias?\s*$/i,
    ]

    for (const pattern of bibliographyStartPatterns) {
      if (pattern.test(text.trim())) {
        console.log(`⚠️ Texto es solo bibliografía, devolviendo mensaje genérico`)
        return "Por favor, reformula tu pregunta para obtener una respuesta más completa."
      }
    }

    // Buscar secciones de bibliografía explícitas SOLO al final del texto
    // No cortar si aparece en el medio (puede ser parte del contenido)
    const lines = text.split('\n')
    const textLength = text.length
    
    // Buscar desde el final hacia arriba por títulos de bibliografía
    let bibliographyStartIndex = -1
    const bibliographyPatterns = [
      /^##?\s*📚\s*Fuentes Consultadas/i,
      /^##?\s*Bibliografía/i,
      /^Fuentes consultadas/i,
      /^Referencias:/i
    ]
    
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Si encontramos un título de bibliografía cerca del final (últimas 20 líneas)
      for (const pattern of bibliographyPatterns) {
        if (pattern.test(line)) {
          bibliographyStartIndex = i
          console.log(`📚 Sección de bibliografía encontrada en línea ${i + 1} (cerca del final)`)
          break
        }
      }
      if (bibliographyStartIndex !== -1) break
    }
    
    // Solo separar si encontramos bibliografía en las últimas líneas Y hay suficiente contenido antes
    if (bibliographyStartIndex !== -1 && bibliographyStartIndex > 3) {
      const contentBeforeBibliography = lines.slice(0, bibliographyStartIndex).join('\n').trim()
      
      // Solo separar si hay al menos 100 caracteres de contenido antes de la bibliografía
      if (contentBeforeBibliography.length >= 100) {
        console.log(`✅ Separando bibliografía del contenido (${contentBeforeBibliography.length} chars antes)`)
        return contentBeforeBibliography
      } else {
        console.log(`ℹ️ Contenido antes de bibliografía muy corto (${contentBeforeBibliography.length} chars), manteniendo todo`)
      }
    }

    // Buscar URLs al final que parezcan ser solo fuentes (últimas 10 líneas)
    let urlCount = 0
    let lastUrlIndex = -1
    
    for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
      if (lines[i].includes('http')) {
        urlCount++
        lastUrlIndex = i
      }
    }
    
    // Si hay muchas URLs seguidas al final (más de 3), probablemente es solo bibliografía
    if (urlCount >= 3 && lastUrlIndex > 5) {
      const contentBeforeUrls = lines.slice(0, Math.max(0, lastUrlIndex - urlCount)).join('\n').trim()
      if (contentBeforeUrls.length >= 100) {
        console.log(`✅ Separando ${urlCount} URLs del contenido al final`)
        return contentBeforeUrls
      }
    }

    console.log(`ℹ️ No se encontró bibliografía clara para separar, devolviendo texto completo`)
    return text
  }

  /**
   * Extrae fuentes del texto de respuesta con detección mejorada
   * Versión mejorada: busca múltiples patrones y líneas anteriores
   */
  private extractSourcesFromText(text: string): Array<{ title: string; url: string }> {
    const sources: Array<{ title: string; url: string }> = []
    
    console.log(`🔍 Extrayendo fuentes del texto (${text.length} caracteres)...`)
    
    // Buscar URLs en el texto
    const urlRegex = /https?:\/\/[^\s\)\]\>]+/g
    const urls = text.match(urlRegex) || []
    
    console.log(`🔗 URLs encontradas: ${urls.length}`)
    
    if (urls.length === 0) {
      console.log(`ℹ️ No se encontraron URLs en el texto`)
      return []
    }
    
    // Buscar títulos asociados con múltiples patrones
    const lines = text.split('\n')
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      if (!line.includes('http')) continue
      
      const urlMatches = line.match(urlRegex)
      if (!urlMatches || urlMatches.length === 0) continue
      
      for (const url of urlMatches) {
        let title = ""
        
        // Patrón 1: **Título** — URL o **Título** URL
        const titleMatch1 = line.match(/\*\*([^*]+)\*\*\s*[—-]?\s*https?:\/\/[^\s]+/)
        if (titleMatch1) {
          title = titleMatch1[1].trim()
        }
        
        // Patrón 2: Número. **Título** (línea anterior)
        if (!title && lineIndex > 0) {
          const prevLine = lines[lineIndex - 1]
          const numberedTitleMatch = prevLine.match(/^\d+\.\s*\*\*([^*]+)\*\*/)
          if (numberedTitleMatch) {
            title = numberedTitleMatch[1].trim()
          }
        }
        
        // Patrón 3: **Título** en línea anterior
        if (!title && lineIndex > 0) {
          const prevLine = lines[lineIndex - 1]
          const boldTitleMatch = prevLine.match(/\*\*([^*]+)\*\*/)
          if (boldTitleMatch && !prevLine.includes('http')) {
            title = boldTitleMatch[1].trim()
          }
        }
        
        // Patrón 4: Título — URL (sin markdown)
        if (!title) {
          const titleMatch4 = line.match(/([^—\n]+?)\s*[—-]\s*https?:\/\/[^\s]+/)
          if (titleMatch4) {
            title = titleMatch4[1].trim()
          }
        }
        
        // Patrón 5: Buscar en líneas anteriores (hasta 3 líneas antes)
        if (!title) {
          for (let i = Math.max(0, lineIndex - 3); i < lineIndex; i++) {
            const prevLine = lines[i]
            // Buscar títulos en negrita que no tengan URLs
            if (prevLine.includes('**') && !prevLine.includes('http')) {
              const titleMatch = prevLine.match(/\*\*([^*]+)\*\*/)
              if (titleMatch) {
                title = titleMatch[1].trim()
                break
              }
            }
            // Buscar títulos numerados
            if (/^\d+\./.test(prevLine.trim()) && !prevLine.includes('http')) {
              const numberedMatch = prevLine.match(/^\d+\.\s*(.+?)$/)
              if (numberedMatch) {
                title = numberedMatch[1].replace(/\*\*/g, '').trim()
                break
              }
            }
          }
        }
        
        // Si no se encuentra título, usar hostname o una descripción de la línea
        if (!title) {
          try {
            const urlObj = new URL(url)
            title = urlObj.hostname.replace('www.', '')
            // Intentar mejorar el título con información de la línea
            if (line.length > 0 && line.length < 200) {
              const lineWithoutUrl = line.replace(url, '').trim()
              if (lineWithoutUrl.length > 5 && lineWithoutUrl.length < 100) {
                title = lineWithoutUrl
              }
            }
          } catch {
            title = "Fuente"
          }
        }
        
        // Limpiar título de caracteres especiales pero mantener contenido útil
        title = title
          .replace(/^[•\-\*]\s*/, '') // Quitar bullet points al inicio
          .replace(/\s*[•\-\*]\s*$/, '') // Quitar bullet points al final
          .replace(/\*\*/g, '') // Quitar markdown bold
          .trim()
        
        // Asegurar que el título no sea solo la URL
        if (title === url || title.length < 3) {
          try {
            title = new URL(url).hostname.replace('www.', '')
          } catch {
            title = "Fuente"
          }
        }
        
        sources.push({ title, url })
        console.log(`📚 Fuente extraída: "${title.substring(0, 60)}" → ${url.substring(0, 60)}`)
      }
    }

    // Eliminar duplicados basándose en URL (case-insensitive)
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url.toLowerCase(), s])).values()
    )

    console.log(`📊 Fuentes únicas encontradas: ${uniqueSources.length} de ${sources.length} totales`)

    // Limitar a 15 fuentes máximo (aumentado de 10)
    return uniqueSources.slice(0, 15)
  }

}