import { env } from "@/lib/env/runtime-env"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Database } from "@/supabase/types"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createMessage } from "@/db/messages"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import OpenAI from "openai"
import { OpenAIStream, StreamingTextResponse } from "ai"

export const runtime = "nodejs"
export const maxDuration = 60

interface RequestBody {
  message?: string // Campo directo (para compatibilidad)
  messages?: Array<{ role: string; content: string }> // Array de mensajes (formato useChat)
  chatSettings?: {
    model?: string
    temperature?: number
  }
  match_count?: number // Configurable match count (default 10)
  chatId?: string // Optional chat ID for message history
}

export async function POST(
  request: NextRequest,
  { params }: { params: { processId: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const supabaseAdmin = createSupabaseClient<Database>(
      env.supabaseUrl(),
      env.supabaseServiceRole()
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { processId } = params
    const body: RequestBody = await request.json()
    const { message, messages: bodyMessages, chatSettings, match_count = 10, chatId } = body

    // Extraer el mensaje: puede venir como campo directo o como último mensaje del array
    let userMessage: string | undefined = message
    
    if (!userMessage && bodyMessages && Array.isArray(bodyMessages) && bodyMessages.length > 0) {
      // Buscar el último mensaje del usuario en el array
      const lastUserMessage = [...bodyMessages].reverse().find(msg => msg.role === "user")
      if (lastUserMessage) {
        userMessage = lastUserMessage.content
      }
    }

    if (!userMessage || userMessage.trim().length === 0) {
      console.error("❌ Mensaje vacío recibido. Body:", JSON.stringify(body, null, 2))
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío" },
        { status: 400 }
      )
    }

    // Verify user has access to the process using admin client
    const { data: processRecord, error: processError } = await supabaseAdmin
      .from("processes")
      .select("*")
      .eq("id", processId)
      .single()

    if (processError || !processRecord) {
      return NextResponse.json(
        { error: "Proceso no encontrado", details: processError?.message },
        { status: 404 }
      )
    }

    if (processRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes acceso a este proceso" },
        { status: 403 }
      )
    }

    // Verify process is ready for chat
    if (processRecord.indexing_status !== "ready") {
      return NextResponse.json(
        { 
          error: "El proceso no está listo para consultas",
          indexing_status: processRecord.indexing_status,
          message: processRecord.indexing_status === "processing" 
            ? "Los documentos se están indexando. Por favor espera unos momentos."
            : processRecord.indexing_status === "pending"
            ? "No hay documentos indexados en este proceso."
            : "Hubo un error al indexar los documentos."
        },
        { status: 400 }
      )
    }

    // Get profile for API keys
    const profile = await getServerProfile()

    // Initialize OpenAI client
    let openai: OpenAI
    if (profile.use_azure_openai) {
      openai = new OpenAI({
        apiKey: profile.azure_openai_api_key || "",
        baseURL: `${profile.azure_openai_endpoint}/openai/deployments/${chatSettings?.model || "gpt-4"}`,
        defaultQuery: { "api-version": "2023-12-01-preview" },
        defaultHeaders: { "api-key": profile.azure_openai_api_key }
      })
    } else {
      openai = new OpenAI({
        apiKey: profile.openai_api_key || "",
        organization: profile.openai_organization_id
      })
    }

    // Generate embedding for user query (RAG)
    console.log(`🔍 [RAG] Generando embedding para la consulta: "${userMessage.substring(0, 100)}..."`)
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Verificar que el embedding tenga la dimensión correcta
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      console.error(`❌ Embedding dimension error: expected 1536, got ${queryEmbedding?.length || 0}`)
      return NextResponse.json(
        { error: "Error al generar embedding: dimensión incorrecta" },
        { status: 500 }
      )
    }

    // Search for similar chunks using RPC function (RAG)
    console.log(`🔍 [RAG] Buscando chunks similares en el proceso...`)
    console.log(`📊 Embedding dimension: ${queryEmbedding.length}`)
    
    // Supabase necesita el vector como array de números
    // El cliente de Supabase debería convertir automáticamente el array a vector
    const { data: similarChunks, error: searchError } = await supabaseAdmin
      .rpc("match_process_document_sections", {
        query_embedding: queryEmbedding as number[], // Asegurar que es array de números
        process_id_param: processId,
        match_count: match_count,
        user_id_param: user.id // Pasar user_id explícitamente para service role
      })

    if (searchError) {
      console.error("❌ Error searching chunks:", searchError)
      return NextResponse.json(
        { error: "Error al buscar información relevante", details: searchError.message },
        { status: 500 }
      )
    }

    if (!similarChunks || similarChunks.length === 0) {
      return NextResponse.json(
        { error: "No se encontró información relevante en los documentos del proceso" },
        { status: 404 }
      )
    }

    console.log(`✅ [RAG] Encontrados ${similarChunks.length} chunks relevantes`)

    // Build context from chunks
    const contextChunks = similarChunks
      .map((chunk: any, index: number) => {
        const docName = chunk.metadata?.file_name || "Documento"
        return `[Fuente ${index + 1}: ${docName}]\n${chunk.content}`
      })
      .join("\n\n---\n\n")

    // Build system prompt
    const systemPrompt = `Eres un asistente legal especializado. Tu tarea es responder preguntas basándote ÚNICAMENTE en los documentos proporcionados del proceso legal "${processRecord.name}".

INSTRUCCIONES:
- Responde SOLO con información que puedas encontrar en los documentos proporcionados
- Si la información no está en los documentos, di claramente que no tienes esa información
- Cita el documento específico cuando sea relevante (ej: "Según el documento [Fuente X]...")
- Sé preciso y profesional en tus respuestas
- Si hay múltiples documentos, considera información de todos ellos
- No inventes información ni hagas suposiciones no respaldadas por los documentos

DOCUMENTOS DEL PROCESO:
${contextChunks}

Responde la siguiente pregunta del usuario basándote en estos documentos:`

    // Get chat history if chatId is provided
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt }
    ]

    if (chatId) {
      const { data: historyMessages } = await supabaseAdmin
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(10) // Last 10 messages for context

      if (historyMessages) {
        // Add history (excluding system messages)
        historyMessages.forEach((msg: any) => {
          if (msg.role !== "system") {
            messages.push({
              role: msg.role as "user" | "assistant",
              content: msg.content
            })
          }
        })
      }
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage })

    // Save user message to database
    if (chatId) {
      try {
        await createMessage({
          chat_id: chatId,
          user_id: user.id,
          content: userMessage,
          role: "user",
          metadata: {
            process_id: processId,
            chunks_used: similarChunks.length
          }
        })
      } catch (error) {
        console.error("Error saving user message:", error)
        // Don't fail the request if message saving fails
      }
    }

    // Call LLM with streaming
    const model = chatSettings?.model || "gpt-4o-mini"
    const temperature = chatSettings?.temperature ?? 0.3

    console.log(`🤖 [LLM] Llamando al modelo ${model} con ${similarChunks.length} chunks de contexto`)

    const completion = await openai.chat.completions.create({
      model: model as any,
      messages: messages as any,
      temperature,
      stream: true
    })

    const stream = OpenAIStream(completion, {
      async onCompletion(completion) {
        // Save assistant response to database
        if (chatId) {
          try {
            await createMessage({
              chat_id: chatId,
              user_id: user.id,
              content: completion,
              role: "assistant",
              metadata: {
                process_id: processId,
                chunks_used: similarChunks.length,
                model: model
              }
            })
          } catch (error) {
            console.error("Error saving assistant message:", error)
            // Don't fail if message saving fails
          }
        }
      }
    })

    return new StreamingTextResponse(stream, {
      headers: {
        "X-Process-Id": processId,
        "X-Chunks-Used": String(similarChunks.length)
      }
    })

  } catch (error: any) {
    console.error("Error in process chat:", error)
    return NextResponse.json(
      { 
        error: "Error al procesar la consulta",
        details: error.message 
      },
      { status: 500 }
    )
  }
}
