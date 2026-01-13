import { env } from "@/lib/env/runtime-env"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { Database } from "@/supabase/types"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import OpenAI from "openai"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { convertDocumentFromUrl } from "@/lib/docling"
import { assertWorkspaceAccess } from "@/src/server/workspaces/access"
import { ragBackendService } from "@/lib/services/rag-backend"

// Process-specific chunking: 500-800 tokens (using 650 as middle ground)
// Overlap: 100 tokens (~15%)
const PROCESS_CHUNK_SIZE = 650
const PROCESS_CHUNK_OVERLAP = 100

export async function POST(
  request: Request,
  { params }: { params: { processId: string } }
) {
  try {
    console.log("📥 Starting ingestion process...")

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const supabaseAdmin = createSupabaseClient<Database>(
      env.supabaseUrl(),
      env.supabaseServiceRole()
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    console.log("✅ User authenticated:", user.id)

    const { processId } = params
    const body = await request.json()
    const documentId = body.document_id as string | undefined
    const skipProcessing = body.skip_processing as boolean | undefined
    const providedMarkdown = body.markdown as string | undefined

    // Verify user has access to the process using admin client
    const { data: processRecord, error: processError } = await supabaseAdmin
      .from("processes")
      .select("id,user_id,workspace_id,name,indexing_status")
      .eq("id", processId)
      .single()
    // ... imports need to be added separately or I can try to add them if I replace the whole file? No, replace_file_content is better for chunks.
    // I will use two calls. One for import, one for logic.


    if (processError || !processRecord) {
      return NextResponse.json(
        { error: "Proceso no encontrado", details: processError?.message },
        { status: 404 }
      )
    }

    if (processRecord.workspace_id) {
      const access = await assertWorkspaceAccess(
        supabaseAdmin,
        processRecord.workspace_id,
        user.id
      ).catch(() => null)

      if (!access) {
        return NextResponse.json(
          { error: "No tienes acceso a este proceso" },
          { status: 403 }
        )
      }
    } else if (processRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes acceso a este proceso" },
        { status: 403 }
      )
    }

    // Get profile for API keys
    const profile = await getServerProfile() as any

    // Get documents to process using admin client
    let documentsToProcess
    if (documentId) {
      const { data: doc, error: docError } = await supabaseAdmin
        .from("process_documents")
        .select("*")
        .eq("id", documentId)
        .single()

      if (docError || !doc) {
        return NextResponse.json(
          { error: "Documento no encontrado", details: docError?.message },
          { status: 404 }
        )
      }

      if (doc.process_id !== processId) {
        return NextResponse.json(
          { error: "El documento no pertenece a este proceso" },
          { status: 400 }
        )
      }
      documentsToProcess = [doc]
    } else {
      // Process all pending documents
      const { data: pendingDocs, error: pendingError } = await supabaseAdmin
        .from("process_documents")
        .select("*")
        .eq("process_id", processId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (pendingError) {
        console.error("❌ Error fetching pending documents:", pendingError)
        throw new Error(`Error obteniendo documentos pendientes: ${pendingError.message}`)
      }

      documentsToProcess = pendingDocs || []
    }

    console.log(`📄 Found ${documentsToProcess.length} document(s) to process`)

    if (documentsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay documentos pendientes de procesar"
      })
    }

    // Initialize OpenAI client
    let openai: OpenAI
    if (profile.use_azure_openai) {
      openai = new OpenAI({
        apiKey: profile.azure_openai_api_key || "",
        baseURL: profile.azure_openai_endpoint || "https://api.openai.com/v1",
        defaultHeaders: { "api-key": profile.azure_openai_api_key }
      })
    } else {
      openai = new OpenAI({
        apiKey: profile.openai_api_key || "",
        organization: profile.openai_organization_id
      })
    }

    // Process each document
    for (const document of documentsToProcess) {
      try {
        console.log(`📄 Processing document: ${document.file_name} (${document.id})`)

        // Update status to processing using admin client
        const { error: updateError } = await supabaseAdmin
          .from("process_documents")
          .update({ status: "processing" })
          .eq("id", document.id)

        if (updateError) {
          console.error(`❌ Error updating document status to processing:`, updateError)
          throw new Error(`Error actualizando estado: ${updateError.message}`)
        }

        // Bypassing local processing if requested (for external RAG backend)
        if (skipProcessing) {
          console.log(`⏩ Skipping local processing for document: ${document.file_name} (using external RAG status)`)

          if (providedMarkdown) {
            console.log(`💾 Saving provided markdown (${providedMarkdown.length} chars)`)

            // Save as a single section for retrieval
            const { error: sectionError } = await supabaseAdmin
              .from("process_document_sections")
              .insert({
                process_id: processId,
                document_id: document.id,
                user_id: user.id,
                content: providedMarkdown,
                tokens: encode(providedMarkdown).length,
                openai_embedding: [] as any, // Placeholder
                metadata: {
                  type: "full_markdown",
                  file_name: document.file_name
                }
              })

            if (sectionError) {
              console.warn(`⚠️ Error saving markdown section:`, sectionError)
            }
          }

          // Update status to indexed immediately
          const { error: indexedError } = await supabaseAdmin
            .from("process_documents")
            .update({
              status: "indexed",
              error_message: null,
              metadata: {
                ...(document.metadata || {}),
                processed_with: "external_rag",
                processed_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq("id", document.id)

          if (indexedError) {
            throw new Error(`Error actualizando estado a indexed: ${indexedError.message}`)
          }

          console.log(`✅ Documento ${document.file_name} marcado como indexado (externo)`)
          continue; // Create signed URL skipped, conversion skipped
        }

        console.log(`🔗 Downloading file from storage: ${document.storage_path}`)

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from("files")
          .download(document.storage_path)

        if (downloadError || !fileData) {
          console.error(`❌ Error downloading file:`, downloadError)
          throw new Error(`Error descargando archivo: ${downloadError?.message}`)
        }

        console.log(`✅ File downloaded successfully, size: ${fileData.size} bytes`)

        // Create File object for ingestion
        const file = new File([fileData], document.file_name, { type: document.mime_type })

        // Ingest to External RAG
        console.log(`🚀 Ingesting ${document.file_name} to RAG backend...`)

        const metadata = {
          process_id: processId,
          file_name: document.file_name,
          mime_type: document.mime_type || "application/octet-stream",
          user_id: user.id,
          document_id: document.id
        }

        try {
          await ragBackendService.ingestDocument(
            file,
            processRecord.workspace_id,
            processId,
            metadata
          )

          // Update status to indexed
          const { error: indexedError } = await supabaseAdmin
            .from("process_documents")
            .update({
              status: "indexed",
              error_message: null,
              metadata: {
                ...(document.metadata || {}),
                processed_with: "external_rag",
                processed_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq("id", document.id)

          if (indexedError) {
            throw new Error(`Error actualizando estado a indexed: ${indexedError.message}`)
          }

          console.log(`✅ Documento ${document.file_name} indexado correctamente (externo)`)

        } catch (ragError: any) {
          console.error(`❌ Error ingesting to RAG backend:`, ragError)
          throw new Error(`Error en ingestión externa: ${ragError.message}`)
        }

      } catch (error: any) {
        console.error(`❌ Error procesando documento ${document.file_name}:`, error)
        console.error("Error stack:", error.stack)

        // Provide user-friendly error message (don't expose internal details like DOCLING_BASE_URL)
        let userFriendlyMessage = error.message || "Error desconocido al procesar el documento"

        // Sanitize error messages to avoid exposing internal details
        if (userFriendlyMessage.includes("DOCLING_BASE_URL")) {
          userFriendlyMessage = "Error de configuración del servicio de procesamiento"
        } else if (userFriendlyMessage.includes("Timeout")) {
          userFriendlyMessage = "El documento tardó demasiado en procesarse. Intenta con un archivo más pequeño."
        } else if (userFriendlyMessage.includes("fetch") || userFriendlyMessage.includes("network")) {
          userFriendlyMessage = "Error de conexión al procesar el documento. Por favor, inténtalo de nuevo."
        }

        // Update document status to error using admin client
        const { error: errorUpdateError } = await supabaseAdmin
          .from("process_documents")
          .update({
            status: "error",
            error_message: userFriendlyMessage,
            updated_at: new Date().toISOString()
          })
          .eq("id", document.id)

        if (errorUpdateError) {
          console.error(`❌ Error updating document status to error:`, errorUpdateError)
        }

        // Continue processing other documents even if one fails
        console.log(`⚠️ Continuing with other documents despite error in ${document.file_name}`)
      }
    }

    // Update process indexing_status based on all documents using admin client
    const { data: allDocuments } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("process_id", processId)
      .eq("status", "indexed")

    const { data: pendingDocuments } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("process_id", processId)
      .eq("status", "pending")

    const { data: processingDocuments } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("process_id", processId)
      .eq("status", "processing")

    const { data: errorDocuments } = await supabaseAdmin
      .from("process_documents")
      .select("*")
      .eq("process_id", processId)
      .eq("status", "error")

    const allDocsCount = allDocuments?.length || 0
    const pendingDocsCount = pendingDocuments?.length || 0
    const processingDocsCount = processingDocuments?.length || 0
    const errorDocsCount = errorDocuments?.length || 0

    console.log(`📊 Document status summary:`, {
      indexed: allDocsCount,
      pending: pendingDocsCount,
      processing: processingDocsCount,
      error: errorDocsCount
    })

    let newIndexingStatus = "ready"
    if (errorDocsCount > 0) {
      newIndexingStatus = "error"
    } else if (processingDocsCount > 0 || pendingDocsCount > 0) {
      newIndexingStatus = "processing"
    } else if (allDocsCount > 0) {
      newIndexingStatus = "ready"
      // Update last_indexed_at
      const { error: updateError } = await supabaseAdmin
        .from("processes")
        .update({
          indexing_status: "ready",
          last_indexed_at: new Date().toISOString()
        })
        .eq("id", processId)

      if (updateError) {
        console.error("❌ Error updating process status to ready:", updateError)
      } else {
        console.log("✅ Process status updated to ready")
      }
    } else {
      newIndexingStatus = "pending"
    }

    if (newIndexingStatus !== "ready") {
      const { error: updateError } = await supabaseAdmin
        .from("processes")
        .update({ indexing_status: newIndexingStatus })
        .eq("id", processId)

      if (updateError) {
        console.error(`❌ Error updating process status to ${newIndexingStatus}:`, updateError)
      } else {
        console.log(`✅ Process status updated to ${newIndexingStatus}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesamiento completado. ${allDocsCount} documento(s) indexado(s).`,
      indexed: allDocsCount,
      errors: errorDocsCount,
      pending: pendingDocsCount,
      processing: processingDocsCount
    })

  } catch (error: any) {
    console.error("❌ Error en ingestión:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Error al procesar documentos",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
