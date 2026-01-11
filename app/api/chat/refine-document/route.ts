import { NextRequest, NextResponse } from "next/server"
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { DOCUMENT_SYSTEM_PROMPT } from "@/lib/prompts/document-system-prompt"
import { draftSchema } from "@/types/draft"

export const runtime = "edge"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { document, instruction, model = "gpt-4o-mini" } = body

        if (!document || !instruction) {
            return NextResponse.json(
                { error: "Se requiere documento e instrucción" },
                { status: 400 }
            )
        }

        const sysPrompt = DOCUMENT_SYSTEM_PROMPT + `
    
    TAREA ACTUAL: REFINAMIENTO DE DOCUMENTO
    El usuario te ha entregado un documento JSON existente y una instrucción para modificarlo.
    Debes devolver el JSON actualizado cumpliendo la instrucción.
    
    Instrucción: "${instruction}"
    
    Asegúrate de mantener la estructura JSON válida y solo modificar el contenido según lo solicitado.
    `

        const chat = new ChatOpenAI({
            modelName: model,
            temperature: 0.3,
            openAIApiKey: process.env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
            },
        })

        const response = await chat.invoke([
            new SystemMessage(sysPrompt),
            new HumanMessage(`Documento actual:\n\`\`\`json\n${JSON.stringify(document)}\n\`\`\n\nModifica el documento según la instrucción: ${instruction}`)
        ])

        const content = response.content as string

        // Intentar extraer JSON
        let refinedDraft
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

        if (jsonMatch) {
            refinedDraft = JSON.parse(jsonMatch[1])
        } else if (content.trim().startsWith('{')) {
            refinedDraft = JSON.parse(content)
        } else {
            throw new Error("El modelo no devolvió un JSON válido")
        }

        // Validar con schema (opcional, flexible)
        // const parsed = draftSchema.parse(refinedDraft)

        return NextResponse.json(refinedDraft)

    } catch (error: any) {
        console.error("Error refining document:", error)
        return NextResponse.json(
            { error: error.message || "Error procesando la solicitud" },
            { status: 500 }
        )
    }
}
