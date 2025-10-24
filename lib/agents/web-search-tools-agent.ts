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
   */
  private async executeSerperSearch(query: string): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY

    if (!apiKey) {
      throw new Error("SERPER_API_KEY no configurada en variables de entorno")
    }

    try {
      console.log(`🔍 Serper Search: "${query}"`)

      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: query,
          num: 10,
          gl: "co", // Colombia
          hl: "es"  // Español
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

      return `🔍 **Búsqueda Serper completada**\n\nQuery: "${query}"\nResultados encontrados: ${items.length}\n\n${formattedResults}`

    } catch (error) {
      console.error(`❌ Error en Serper:`, error)
      return `❌ Error en búsqueda Serper: ${error instanceof Error ? error.message : 'Error desconocido'}`
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
      // Definir herramienta serper_search
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "serper_search",
            description: "Busca información en la web usando Serper.dev. Usa esta herramienta cuando necesites información actualizada, verificar datos legales, o buscar fuentes oficiales colombianas.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Query de búsqueda optimizada. Ejemplo: 'cuentas en participación Colombia Código de Comercio'"
                }
              },
              required: ["query"]
            }
          }
        }
      ]

      // Prompt del sistema estilo n8n
      const systemPrompt = `Eres un Agente de Investigación Legal Colombiano. Tu meta es responder con precisión y trazabilidad jurídica.

POLÍTICA DE HERRAMIENTA:
- Usa la herramienta serper_search cuando necesites información actualizada o verificar datos
- Llama a serper_search con: {"query":"<consulta optimizada>"}
- No muestres la llamada a la herramienta, solo los resultados procesados

CUÁNDO BUSCAR:
- Información legal específica (leyes, decretos, sentencias)
- Datos actualizados o recientes
- Verificación de información normativa
- Cuando no tengas certeza completa

CUÁNDO NO BUSCAR:
- Preguntas generales que puedas responder con tu conocimiento
- Conversación casual
- Preguntas sin contexto suficiente

FORMATO DE RESPUESTA:
- Respuesta clara y fundamentada
- Citas de fuentes cuando uses la herramienta
- URLs de las fuentes consultadas

IMPORTANTE: Siempre incluye las URLs de las fuentes en tu respuesta para que puedan ser extraídas como fuentes.`

      // Primera llamada al modelo con herramienta disponible
      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        tools,
        tool_choice: "auto", // El modelo decide si usar la herramienta
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })

      const message = response.choices[0]?.message
      if (!message) {
        throw new Error("No se recibió respuesta del modelo")
      }

      console.log(`✅ Primera respuesta recibida`)

      // Si el modelo llamó la herramienta
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🔧 Modelo decidió buscar - ejecutando ${message.tool_calls.length} herramienta(s)`)
        
        const toolResults = await Promise.all(
          message.tool_calls.map(async (toolCall) => {
            const { name, arguments: args } = toolCall.function
            const parsedArgs = JSON.parse(args)
            
            console.log(`🔧 Ejecutando ${name}:`, parsedArgs)
            
            try {
              let result: string
              
              if (name === "serper_search") {
                result = await this.executeSerperSearch(parsedArgs.query)
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

        // Segunda llamada con resultados de la herramienta
        const finalResponse = await this.client.chat.completions.create({
          model: this.config.model!,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userQuery },
            message,
            ...toolResults
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        })

        const finalMessage = finalResponse.choices[0]?.message
        const finalText = finalMessage?.content || "No se pudo generar una respuesta."
        
        console.log(`📊 Respuesta final con búsqueda: ${finalText.substring(0, 100)}...`)
        
        // Extraer fuentes del texto final
        const sources = this.extractSourcesFromText(finalText)
        
        return {
          type: "answer",
          text: finalText,
          sources
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
            
            // Extraer fuentes del texto final
            const sources = this.extractSourcesFromText(finalText)
            
            return {
              type: "answer",
              text: finalText,
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
   * Extrae fuentes del texto de respuesta con detección mejorada
   */
  private extractSourcesFromText(text: string): Array<{ title: string; url: string }> {
    const sources: Array<{ title: string; url: string }> = []
    
    console.log(`🔍 Extrayendo fuentes del texto...`)
    
    // Buscar URLs en el texto
    const urlRegex = /https?:\/\/[^\s\)]+/g
    const urls = text.match(urlRegex) || []
    
    console.log(`🔗 URLs encontradas: ${urls.length}`)
    
    // Buscar títulos asociados con múltiples patrones
    const lines = text.split('\n')
    
    for (const line of lines) {
      if (line.includes('http')) {
        const urlMatch = line.match(urlRegex)
        if (urlMatch) {
          const url = urlMatch[0]
          let title = ""
          
          // Patrón 1: **Título** — URL
          const titleMatch1 = line.match(/\*\*(.+?)\*\*\s*—\s*https?:\/\/[^\s]+/)
          if (titleMatch1) {
            title = titleMatch1[1].trim()
          }
          
          // Patrón 2: Título — URL
          if (!title) {
            const titleMatch2 = line.match(/(.+?)\s*—\s*https?:\/\/[^\s]+/)
            if (titleMatch2) {
              title = titleMatch2[1].trim()
            }
          }
          
          // Patrón 3: **Título** URL
          if (!title) {
            const titleMatch3 = line.match(/\*\*(.+?)\*\*\s*https?:\/\/[^\s]+/)
            if (titleMatch3) {
              title = titleMatch3[1].trim()
            }
          }
          
          // Patrón 4: Título URL (sin separador)
          if (!title) {
            const titleMatch4 = line.match(/(.+?)\s*https?:\/\/[^\s]+/)
            if (titleMatch4) {
              title = titleMatch4[1].trim()
            }
          }
          
          // Patrón 5: Buscar título en líneas anteriores
          if (!title) {
            const lineIndex = lines.indexOf(line)
            for (let i = Math.max(0, lineIndex - 3); i < lineIndex; i++) {
              const prevLine = lines[i]
              if (prevLine.includes('**') && prevLine.includes('**') && !prevLine.includes('http')) {
                const titleMatch = prevLine.match(/\*\*(.+?)\*\*/)
                if (titleMatch) {
                  title = titleMatch[1].trim()
                  break
                }
              }
            }
          }
          
          // Si no se encuentra título, usar hostname
          if (!title) {
            try {
              title = new URL(url).hostname
            } catch {
              title = "Fuente"
            }
          }
          
          // Limpiar título de caracteres especiales
          title = title.replace(/[•\-\*]/g, '').trim()
          
          sources.push({ title, url })
          console.log(`📚 Fuente extraída: "${title}" → ${url}`)
        }
      }
    }

    // Eliminar duplicados basándose en URL
    const uniqueSources = sources.filter((source, index, self) => 
      index === self.findIndex(s => s.url === source.url)
    )

    console.log(`📊 Fuentes únicas encontradas: ${uniqueSources.length}`)

    // Limitar a 10 fuentes máximo
    return uniqueSources.slice(0, 10)
  }

}