/**
 * Clasificador de intenciones usando LLM para detectar solicitudes de documentos legales.
 * Se usa después de la detección heurística para mayor precisión.
 */

import OpenAI from "openai"

export interface ClassificationResult {
    is_document: boolean
    doc_type: "contrato" | "minuta" | "tutela" | "derecho_de_peticion" | "memorial" | "comunicado" | "correo" | "otro"
    confidence: number
}

const CLASSIFICATION_PROMPT = `Eres un clasificador de intenciones para un asistente legal colombiano. 
Analiza el mensaje del usuario y determina si está solicitando la generación de un documento legal estructurado.

Responde SOLO con un JSON válido (sin markdown, sin texto adicional):
{
  "is_document": boolean,
  "doc_type": "contrato|minuta|tutela|derecho_de_peticion|memorial|comunicado|correo|otro",
  "confidence": 0.0-1.0
}

Criterios:
- is_document=true si el usuario pide redactar, generar, crear, elaborar un documento legal
- doc_type debe ser el tipo más específico posible basado en el mensaje
- confidence debe reflejar la certeza (0.6+ para activar modo documento)

Mensaje del usuario: "{userMessage}"`

/**
 * Clasifica la intención del usuario usando un LLM vía OpenRouter.
 * @param userMessage Mensaje del usuario a clasificar
 * @param model Modelo a usar (opcional, por defecto gpt-4o-mini)
 * @returns Resultado de la clasificación
 */
export async function classifyWithLLM(
    userMessage: string,
    model?: string
): Promise<ClassificationResult> {
    try {
        // Usar OpenRouter como en el resto del código
        const openrouterApiKey = process.env.OPENROUTER_API_KEY
        if (!openrouterApiKey) {
            console.warn("⚠️ OPENROUTER_API_KEY no configurada, usando fallback")
            return { is_document: false, doc_type: "otro", confidence: 0.1 }
        }

        const client = new OpenAI({
            apiKey: openrouterApiKey,
            baseURL: "https://openrouter.ai/api/v1"
        })

        const response = await client.chat.completions.create({
            model: model || "openai/gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Eres un clasificador de intenciones. Responde SOLO con JSON válido, sin texto adicional."
                },
                {
                    role: "user",
                    content: CLASSIFICATION_PROMPT.replace("{userMessage}", userMessage)
                }
            ],
            temperature: 0.1,
            max_tokens: 150,
            response_format: { type: "json_object" }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return { is_document: false, doc_type: "otro", confidence: 0.1 }
        }

        // Parsear respuesta JSON
        let parsed: ClassificationResult
        try {
            parsed = JSON.parse(content)
        } catch (e) {
            // Intentar extraer JSON si viene envuelto en markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0])
            } else {
                console.warn("No se pudo parsear respuesta del clasificador:", content)
                return { is_document: false, doc_type: "otro", confidence: 0.1 }
            }
        }

        // Validar estructura
        if (typeof parsed.is_document !== "boolean" || 
            typeof parsed.confidence !== "number" ||
            !parsed.doc_type) {
            return { is_document: false, doc_type: "otro", confidence: 0.1 }
        }

        // Asegurar que confidence esté en rango válido
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence))

        return parsed
    } catch (error) {
        console.error("Error en clasificación LLM:", error)
        // Fallback: retornar resultado conservador
        return { is_document: false, doc_type: "otro", confidence: 0.1 }
    }
}

/**
 * Clasifica la intención combinando heurística y LLM.
 * @param userMessage Mensaje del usuario
 * @param heuristicResult Resultado de la detección heurística
 * @param useLLM Si debe usar LLM para clasificación (por defecto true si heuristicResult.isDraft)
 * @returns Resultado de la clasificación
 */
export async function classifyDocumentIntent(
    userMessage: string,
    heuristicResult: { isDraft: boolean; confidence: number; type?: string },
    useLLM: boolean = true
): Promise<ClassificationResult> {
    // Si la heurística dice que NO es draft con alta confianza, no usar LLM
    if (!heuristicResult.isDraft && heuristicResult.confidence < 0.3) {
        return {
            is_document: false,
            doc_type: "otro",
            confidence: 0.1
        }
    }

    // Si no usar LLM, retornar resultado heurístico
    if (!useLLM) {
        return {
            is_document: heuristicResult.isDraft,
            doc_type: (heuristicResult.type as ClassificationResult["doc_type"]) || "otro",
            confidence: heuristicResult.confidence
        }
    }

    // Usar LLM para clasificación más precisa
    const llmResult = await classifyWithLLM(userMessage)
    
    // Combinar resultados: si heurística tiene alta confianza, darle más peso
    if (heuristicResult.isDraft && heuristicResult.confidence >= 0.8) {
        return {
            is_document: true,
            doc_type: (heuristicResult.type as ClassificationResult["doc_type"]) || llmResult.doc_type,
            confidence: Math.max(llmResult.confidence, heuristicResult.confidence * 0.9)
        }
    }

    return llmResult
}

