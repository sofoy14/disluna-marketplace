import OpenAI from "openai"

export interface FactCheckResult {
  isAccurate: boolean
  confidence: number
  issues: string[]
  corrections: string[]
  sources: string[]
}

export interface AntiHallucinationConfig {
  enableFactChecking: boolean
  requireSources: boolean
  maxConfidenceThreshold: number
  enableSourceVerification: boolean
  enableCrossValidation: boolean
}

/**
 * Sistema anti-alucinación para mejorar la precisión de las respuestas
 */
export class AntiHallucinationSystem {
  private client: OpenAI
  private modelName: string = 'alibaba/tongyi-deepresearch-30b-a3b'

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1"
    })
  }

  /**
   * Verifica la precisión de una respuesta antes de enviarla
   */
  async factCheckResponse(
    query: string,
    response: string,
    sources: Array<{ title: string; url: string; content: string }>,
    config: AntiHallucinationConfig
  ): Promise<FactCheckResult> {
    console.log(`🔍 VERIFICACIÓN ANTI-ALUCINACIÓN`)
    console.log(`📝 Query: "${query}"`)
    console.log(`📄 Respuesta: ${response.length} caracteres`)
    console.log(`📚 Fuentes: ${sources.length}`)

    const factCheckPrompt = `
Eres un verificador de hechos especializado en derecho colombiano. Tu tarea es identificar alucinaciones y errores en respuestas legales.

CONSULTA ORIGINAL: "${query}"

RESPUESTA A VERIFICAR:
${response}

FUENTES DISPONIBLES:
${sources.map((source, index) => `
${index + 1}. ${source.title}
   URL: ${source.url}
   Contenido: ${source.content.substring(0, 500)}...
`).join('\n')}

CRITERIOS DE VERIFICACIÓN:
1. ¿Las referencias legales son correctas? (artículos, leyes, sentencias)
2. ¿Los números de artículos existen realmente?
3. ¿Las fechas son coherentes?
4. ¿Los nombres de entidades son correctos?
5. ¿La información está respaldada por las fuentes?
6. ¿Hay información inventada o especulativa?

INSTRUCCIONES:
- Si encuentras información NO respaldada por las fuentes, marca como alucinación
- Si encuentras referencias legales incorrectas, marca como error
- Si encuentras información especulativa sin fundamento, marca como problema
- Sé estricto: es mejor ser conservador que permitir alucinaciones

Responde en formato JSON:
{
  "isAccurate": true/false,
  "confidence": 0.0-1.0,
  "issues": ["problema1", "problema2"],
  "corrections": ["corrección1", "corrección2"],
  "sources": ["fuente1", "fuente2"]
}
`

    try {
      const factCheckResponse = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: factCheckPrompt
          }
        ],
        temperature: 0.1, // Muy baja temperatura para precisión
        max_tokens: 1000
      })

      const content = factCheckResponse.choices[0]?.message?.content || '{}'
      const result = JSON.parse(content) as FactCheckResult

      console.log(`🎯 Verificación completada:`)
      console.log(`   📊 Precisión: ${result.isAccurate ? '✅' : '❌'}`)
      console.log(`   🎯 Confianza: ${result.confidence.toFixed(2)}`)
      console.log(`   ⚠️ Problemas: ${result.issues.length}`)
      console.log(`   🔧 Correcciones: ${result.corrections.length}`)

      return result

    } catch (error) {
      console.error('❌ Error en verificación de hechos:', error)
      
      // Fallback conservador
      return {
        isAccurate: false,
        confidence: 0.3,
        issues: ['Error en verificación automática'],
        corrections: ['Revisar manualmente la respuesta'],
        sources: []
      }
    }
  }

  /**
   * Genera una respuesta más conservadora y precisa
   */
  async generateConservativeResponse(
    query: string,
    sources: Array<{ title: string; url: string; content: string }>,
    previousResponse?: string
  ): Promise<string> {
    console.log(`🛡️ GENERANDO RESPUESTA CONSERVADORA`)
    console.log(`📝 Query: "${query}"`)
    console.log(`📚 Fuentes: ${sources.length}`)

    const conservativePrompt = `
Eres un asistente legal experto en derecho colombiano. Genera una respuesta PRECISA y CONSERVADORA basándote ÚNICAMENTE en la información proporcionada.

CONSULTA: "${query}"

INFORMACIÓN DISPONIBLE:
${sources.map((source, index) => `
${index + 1}. ${source.title}
   URL: ${source.url}
   Contenido: ${source.content}
`).join('\n')}

INSTRUCCIONES ESTRICTAS:
1. Responde ÚNICAMENTE con información respaldada por las fuentes
2. Si no tienes información suficiente, dilo claramente
3. NO inventes artículos, leyes o sentencias
4. NO hagas especulaciones sin fundamento
5. Si mencionas un artículo, asegúrate de que existe
6. Si mencionas una entidad, asegúrate de que es correcta
7. Usa lenguaje conservador: "según las fuentes", "de acuerdo con", "se indica que"
8. Si hay información contradictoria, menciona ambas perspectivas
9. Termina con una advertencia sobre consultar fuentes oficiales

FORMATO DE RESPUESTA:
- Introducción clara del tema
- Desarrollo basado en fuentes
- Referencias específicas cuando sea posible
- Advertencia sobre limitaciones
- Recomendación de consulta profesional

${previousResponse ? `\nRESPUESTA ANTERIOR (para referencia):\n${previousResponse}` : ''}
`

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: conservativePrompt
          },
          {
            role: "user",
            content: `Genera una respuesta conservadora y precisa para: "${query}"`
          }
        ],
        temperature: 0.2, // Temperatura baja para precisión
        max_tokens: 3000
      })

      const content = response.choices[0]?.message?.content || 'No se pudo generar respuesta'

      console.log(`✅ Respuesta conservadora generada: ${content.length} caracteres`)
      return content

    } catch (error) {
      console.error('❌ Error generando respuesta conservadora:', error)
      
      return `Disculpe, hubo un error procesando su consulta. Por favor, consulte directamente las fuentes oficiales para obtener información precisa sobre: "${query}"`
    }
  }

  /**
   * Valida referencias legales específicas
   */
  async validateLegalReferences(
    response: string,
    sources: Array<{ title: string; url: string; content: string }>
  ): Promise<{
    validReferences: string[]
    invalidReferences: string[]
    missingReferences: string[]
  }> {
    console.log(`📋 VALIDANDO REFERENCIAS LEGALES`)

    const validationPrompt = `
Eres un experto en derecho colombiano. Valida las referencias legales mencionadas en la respuesta.

RESPUESTA A VALIDAR:
${response}

FUENTES DISPONIBLES:
${sources.map((source, index) => `
${index + 1}. ${source.title}
   Contenido: ${source.content}
`).join('\n')}

TAREA:
1. Identifica todas las referencias legales en la respuesta (artículos, leyes, sentencias, decretos)
2. Verifica si cada referencia está respaldada por las fuentes
3. Marca como inválidas las referencias que no aparecen en las fuentes
4. Identifica referencias que deberían estar pero no están

Responde en formato JSON:
{
  "validReferences": ["referencia válida 1", "referencia válida 2"],
  "invalidReferences": ["referencia inválida 1", "referencia inválida 2"],
  "missingReferences": ["referencia faltante 1", "referencia faltante 2"]
}
`

    try {
      const validationResponse = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: validationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 800
      })

      const content = validationResponse.choices[0]?.message?.content || '{}'
      const result = JSON.parse(content)

      console.log(`📊 Validación completada:`)
      console.log(`   ✅ Referencias válidas: ${result.validReferences?.length || 0}`)
      console.log(`   ❌ Referencias inválidas: ${result.invalidReferences?.length || 0}`)
      console.log(`   ⚠️ Referencias faltantes: ${result.missingReferences?.length || 0}`)

      return result

    } catch (error) {
      console.error('❌ Error validando referencias:', error)
      
      return {
        validReferences: [],
        invalidReferences: [],
        missingReferences: []
      }
    }
  }

  /**
   * Aplica correcciones a una respuesta basándose en la verificación
   */
  async applyCorrections(
    originalResponse: string,
    factCheckResult: FactCheckResult,
    sources: Array<{ title: string; url: string; content: string }>
  ): Promise<string> {
    if (factCheckResult.isAccurate && factCheckResult.confidence > 0.8) {
      console.log(`✅ Respuesta precisa, no se requieren correcciones`)
      return originalResponse
    }

    console.log(`🔧 APLICANDO CORRECCIONES`)
    console.log(`⚠️ Problemas encontrados: ${factCheckResult.issues.length}`)

    const correctionPrompt = `
Eres un editor legal experto. Corrige la respuesta eliminando alucinaciones y errores.

RESPUESTA ORIGINAL:
${originalResponse}

PROBLEMAS IDENTIFICADOS:
${factCheckResult.issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n')}

CORRECCIONES SUGERIDAS:
${factCheckResult.corrections.map((correction, index) => `${index + 1}. ${correction}`).join('\n')}

FUENTES DISPONIBLES:
${sources.map((source, index) => `
${index + 1}. ${source.title}
   Contenido: ${source.content.substring(0, 300)}...
`).join('\n')}

INSTRUCCIONES:
1. Elimina información no respaldada por las fuentes
2. Corrige referencias legales incorrectas
3. Mantén solo información verificable
4. Usa lenguaje conservador
5. Incluye advertencias sobre limitaciones
6. Agrega recomendación de consulta profesional

Genera la respuesta corregida:
`

    try {
      const correctionResponse = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: "system",
            content: correctionPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })

      const correctedContent = correctionResponse.choices[0]?.message?.content || originalResponse

      console.log(`✅ Correcciones aplicadas: ${correctedContent.length} caracteres`)
      return correctedContent

    } catch (error) {
      console.error('❌ Error aplicando correcciones:', error)
      
      // Fallback: agregar advertencia a la respuesta original
      return `${originalResponse}

⚠️ ADVERTENCIA IMPORTANTE: Esta respuesta puede contener información no verificada. Por favor, consulte las fuentes oficiales para confirmar la información antes de tomar decisiones legales.`
    }
  }
}

/**
 * Instancia singleton del sistema anti-alucinación
 */
export function createAntiHallucinationSystem(apiKey: string): AntiHallucinationSystem {
  return new AntiHallucinationSystem(apiKey)
}










