import { NextRequest, NextResponse } from "next/server"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import OpenAI from "openai"
import { ResearchToolsAgent } from "@/lib/agents/research-tools-agent"

export const maxDuration = 120

interface RequestBody {
  chatSettings?: { model?: string }
  messages: Array<{ role: string; content: string }>
  chatId?: string
  userId?: string
  processId?: string
  fileIds?: string[]
}

function extractLastUserMessage(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter(m => m.role === 'user')
  return userMessages[userMessages.length - 1]?.content || ""
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { messages, processId, fileIds } = body

    const profile = await getServerProfile()
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const userQuery = extractLastUserMessage(messages)

    // RAG condicional: solo si hay proceso o archivos EXPLÍCITOS
    // Priorizar búsqueda web para consultas legales generales
    const hasExplicitFiles = Array.isArray(fileIds) && fileIds.length > 0
    const hasProcess = Boolean(processId)
    
    // Detectar si la consulta requiere búsqueda web (preguntas legales generales)
    const requiresWebSearch = userQuery.match(/\b(cómo|qué|cuándo|dónde|quién|por qué|son|es|tributan|regulación|normatividad|ley|decreto|sentencia|jurisprudencia|clasificación|naturaleza|definición)\b/i)
    
    // Solo usar RAG si hay archivos explícitos/proceso Y la consulta no claramente requiere búsqueda web
    const ragEnabled = (hasExplicitFiles || hasProcess) && !requiresWebSearch
    let ragContext = ""
    
    console.log(`🔍 Research endpoint:`)
    console.log(`   - Requiere búsqueda web: ${requiresWebSearch ? 'Sí' : 'No'}`)
    console.log(`   - Tiene archivos explícitos: ${hasExplicitFiles ? 'Sí' : 'No'}`)
    console.log(`   - Tiene proceso: ${hasProcess ? 'Sí' : 'No'}`)
    console.log(`   - RAG habilitado: ${ragEnabled ? 'Sí' : 'No'} (prioridad a búsqueda web)`)

    if (ragEnabled && profile.openai_api_key) {
      const openai = new OpenAI({ apiKey: profile.openai_api_key })

      // 1) Determinar file ids
      let targetFileIds: string[] = []
      if (Array.isArray(fileIds) && fileIds.length > 0) {
        targetFileIds = fileIds
      } else if (processId) {
        // archivos del proceso
        const { data: procFiles } = await supabaseAdmin
          .from("process_files")
          .select("file_id")
          .eq("process_id", processId)
          .eq("user_id", profile.user_id)
        targetFileIds = (procFiles || []).map((r: any) => r.file_id)
      }

      if (targetFileIds.length > 0) {
        // 2) Embedding de la query
        const emb = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: userQuery
        })
        const queryEmbedding = emb.data[0]?.embedding as any

        // 3) Match top-K
        const { data: matches } = await supabaseAdmin.rpc("match_file_items_openai", {
          query_embedding: queryEmbedding,
          match_count: 5,
          file_ids: targetFileIds
        })

        if (matches && matches.length > 0) {
          const snippets = matches
            .map((m: any, i: number) => `(${i + 1}) ${m.content}`)
            .join("\n\n")
          ragContext = `\n\n[Contexto de documentos del usuario]\n${snippets}\n\n`
        }
      }
    }

    // Agente Tongyi 30B + herramientas web
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 500 })
    }

    const agent = new ResearchToolsAgent({ apiKey, model: "alibaba/tongyi-deepresearch-30b-a3b" })
    const agentResponse = await agent.processQuery(`${userQuery}${ragContext}`)

    // Normalizar bibliografía
    const bibliography = (agentResponse.sources || []).map((s, idx) => ({
      id: s.id || `src-${idx + 1}`,
      title: s.title,
      url: s.url,
      type: (() => {
        const u = s.url.toLowerCase()
        if (u.includes('corteconstitucional') || s.title.toLowerCase().includes('corte constitucional')) return 'sentencia constitucional'
        if (u.includes('consejodeestado') || s.title.toLowerCase().includes('consejo de estado')) return 'sentencia administrativa'
        if (u.includes('suin-juriscol') || s.title.toLowerCase().includes('ley') || s.title.toLowerCase().includes('decreto')) return 'norma legal'
        if (u.includes('imprenta.gov.co') || s.title.toLowerCase().includes('diario oficial')) return 'documento oficial'
        return 'documento web'
      })(),
      description: s.description || undefined
    }))

    return NextResponse.json({ message: agentResponse.text, bibliography })
  } catch (error) {
    console.error("❌ Error en /api/chat/research:", error)
    return NextResponse.json(
      { message: "Ocurrió un error procesando tu consulta.", bibliography: [], error: String(error) },
      { status: 500 }
    )
  }
}


