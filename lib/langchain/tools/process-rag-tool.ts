/**
 * Herramienta de RAG para buscar en documentos de procesos
 * 
 * Permite al agente legal buscar información específica en los documentos
 * indexados de un proceso legal.
 */

import { StructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { Database } from "@/supabase/types"
import OpenAI from "openai"

// ═══════════════════════════════════════════════════════════════════════════════
// HERRAMIENTA DE BÚSQUEDA EN PROCESOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea una instancia de la herramienta de búsqueda en documentos con el process_id configurado
 */
export function createProcessRagTool(processId: string): StructuredTool {
  return new StructuredTool({
    name: "buscar_en_documentos_proceso",
    description: `Busca información específica en los documentos indexados de un proceso legal.
    
    USAR ESTA HERRAMIENTA cuando:
    - El usuario pregunta sobre información contenida en los documentos del proceso
    - Necesitas citar o referenciar contenido específico de los documentos
    - Quieres verificar información contra los documentos del proceso
    
    NO USAR cuando:
    - La pregunta es sobre normativa general colombiana (usa buscar_articulo_ley)
    - La pregunta requiere búsqueda en internet (usa google_search_directo)
    - La pregunta es sobre jurisprudencia (usa search_legal_official)
    
    Parámetros:
    - query: La consulta o pregunta sobre los documentos
    - match_count: Número de chunks a recuperar (default: 10)`,
    
    schema: z.object({
      query: z.string().describe("La consulta o pregunta sobre los documentos del proceso"),
      match_count: z.number().optional().default(10).describe("Número de chunks relevantes a recuperar (máximo 20)")
    }),
    
    async func({ query, match_count = 10 }) {
      const process_id = processId
      try {
        console.log(`\n🔍 [RAG Tool] Buscando en documentos del proceso: "${query.substring(0, 100)}..."`)
        
        if (!process_id) {
          return JSON.stringify({
            error: "No se proporcionó process_id. Esta herramienta requiere un proceso específico.",
            results: []
          })
        }

        // Validar match_count
        const validMatchCount = Math.min(Math.max(1, match_count), 20)

        // Inicializar cliente Supabase (lazy initialization)
        const { getSupabaseServer } = await import("@/lib/supabase/server-client");
        const supabase = getSupabaseServer();

        // Verificar que el proceso existe y está listo
        const { data: process, error: processError } = await supabase
          .from("processes")
          .select("id, name, indexing_status")
          .eq("id", process_id)
          .single()

        if (processError || !process) {
          return JSON.stringify({
            error: `Proceso no encontrado: ${processError?.message || "Proceso no existe"}`,
            results: []
          })
        }

        if (process.indexing_status !== "ready") {
          return JSON.stringify({
            error: `El proceso no está listo para consultas. Estado: ${process.indexing_status}`,
            results: []
          })
        }

        // Generar embedding de la consulta
        const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
        if (!openaiApiKey) {
          return JSON.stringify({
            error: "No se configuró la API key de OpenAI para generar embeddings",
            results: []
          })
        }

        const openai = new OpenAI({
          apiKey: openaiApiKey,
          baseURL: process.env.OPENROUTER_API_KEY 
            ? "https://openrouter.ai/api/v1"
            : undefined
        })

        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: query
        })

        const queryEmbedding = embeddingResponse.data[0].embedding

        // Buscar chunks similares usando la función RPC
        const { data: similarChunks, error: searchError } = await supabase.rpc(
          "match_process_document_sections",
          {
            query_embedding: queryEmbedding as any,
            process_id_param: process_id,
            match_count: validMatchCount
          }
        )

        if (searchError) {
          console.error("❌ Error en búsqueda RAG:", searchError)
          return JSON.stringify({
            error: `Error al buscar en documentos: ${searchError.message}`,
            results: []
          })
        }

        if (!similarChunks || similarChunks.length === 0) {
          return JSON.stringify({
            message: "No se encontró información relevante en los documentos del proceso para esta consulta.",
            results: [],
            process_name: process.name
          })
        }

        // Formatear resultados
        const results = similarChunks.map((chunk: any, index: number) => {
          const docName = chunk.metadata?.file_name || "Documento sin nombre"
          const similarity = chunk.similarity || 0
          
          return {
            rank: index + 1,
            content: chunk.content,
            document: docName,
            similarity: similarity.toFixed(4),
            metadata: {
              chunk_index: chunk.metadata?.chunk_index,
              total_chunks: chunk.metadata?.total_chunks,
              file_name: docName
            }
          }
        })

        console.log(`✅ [RAG Tool] Encontrados ${results.length} chunks relevantes`)

        return JSON.stringify({
          message: `Se encontraron ${results.length} fragmentos relevantes en los documentos del proceso "${process.name}".`,
          results: results,
          process_name: process.name,
          query: query
        }, null, 2)

      } catch (error: any) {
        console.error("❌ Error en searchProcessDocumentsTool:", error)
        return JSON.stringify({
          error: `Error al buscar en documentos: ${error.message || "Error desconocido"}`,
          results: []
        })
      }
    }
  })
}

