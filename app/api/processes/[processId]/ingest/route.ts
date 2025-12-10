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
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing Supabase environment variables")
      throw new Error("Missing Supabase configuration")
    }
    
    const supabaseAdmin = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
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

    // Get profile for API keys
    const profile = await getServerProfile()

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

        console.log(`🔗 Creating signed URL for file: ${document.storage_path}`)

        // Create signed URL for Docling to access the file (10 minutes TTL)
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from("files")
          .createSignedUrl(document.storage_path, 600) // 10 minutes

        if (signedUrlError || !signedUrlData) {
          console.error(`❌ Error creating signed URL:`, signedUrlError)
          console.error(`File path: ${document.storage_path}`)
          throw new Error(`Error generando URL firmada: ${signedUrlError?.message || "No se pudo generar URL"}`)
        }

        const signedUrl = signedUrlData.signedUrl
        console.log(`✅ Signed URL created successfully`)

        // Determine file type to validate support
        const fileExtension = document.file_name.split(".").pop()?.toLowerCase()
        
        // Docling supports: PDF, DOCX, PPTX, HTML, images, Markdown, etc.
        // For now, we'll try Docling for all types and mark as error if it fails
        // In the future, we could add fallback to old parsing for unsupported types
        
        console.log(`🔄 Converting document with Docling: ${document.file_name}`)
        
        let markdownContent: string
        let doclingRawJson: any = undefined
        
        try {
          const conversionResult = await convertDocumentFromUrl(signedUrl)
          markdownContent = conversionResult.markdown
          doclingRawJson = conversionResult.rawJson
          
          if (!markdownContent || markdownContent.trim().length === 0) {
            throw new Error("Docling retornó contenido vacío")
          }
          
          // Verificar si el markdown es realmente JSON (fallback)
          if (markdownContent.trim().startsWith("{") || markdownContent.trim().startsWith("[")) {
            console.warn("⚠️ Markdown parece ser JSON, intentando extraer texto...")
            try {
              const jsonData = JSON.parse(markdownContent)
              // Intentar extraer texto del JSON
              const extractText = (obj: any): string => {
                if (typeof obj === "string") return obj
                if (Array.isArray(obj)) {
                  return obj.map(extractText).filter(Boolean).join("\n")
                }
                if (typeof obj === "object" && obj !== null) {
                  const texts: string[] = []
                  for (const key in obj) {
                    if (["text", "content", "markdown", "body"].includes(key) && typeof obj[key] === "string") {
                      texts.push(obj[key])
                    } else if (typeof obj[key] === "object") {
                      const extracted = extractText(obj[key])
                      if (extracted) texts.push(extracted)
                    }
                  }
                  return texts.join("\n")
                }
                return ""
              }
              const extractedText = extractText(jsonData)
              if (extractedText && extractedText.length > 100) {
                markdownContent = extractedText
                console.log(`✅ Texto extraído del JSON: ${markdownContent.length} chars`)
              }
            } catch (e) {
              console.warn("⚠️ No se pudo parsear como JSON, usando contenido tal cual")
            }
          }
          
          console.log(`✅ Document converted successfully, markdown length: ${markdownContent.length} chars`)
          if (doclingRawJson) {
            console.log(`✅ Docling JSON structured data available`)
          }
        } catch (doclingError: any) {
          console.error(`❌ Error converting document with Docling:`, doclingError)
          console.error(`Error details:`, {
            message: doclingError.message,
            stack: doclingError.stack
          })
          
          // Provide user-friendly error message without exposing internal details
          let errorMessage = "Error al procesar el documento. Por favor, inténtalo de nuevo o contacta soporte."
          
          if (doclingError.message?.includes("DOCLING_BASE_URL")) {
            errorMessage = "Servicio de conversión de documentos no configurado"
          } else if (doclingError.message?.includes("Timeout") || doclingError.message?.includes("AbortError")) {
            errorMessage = "El documento es demasiado grande o el procesamiento tardó demasiado"
          } else if (doclingError.message?.includes("URL de Docling inválida") || doclingError.message?.includes("Failed to parse URL")) {
            errorMessage = "Error de configuración del servicio de procesamiento. Verifica la configuración."
            // Log más detallado para debugging
            console.error(`⚠️ Problema con DOCLING_BASE_URL. Verifica que esté correctamente configurada.`)
          } else if (doclingError.message?.includes("fetch") || doclingError.message?.includes("network") || doclingError.message?.includes("ECONNREFUSED")) {
            errorMessage = "Error de conexión al procesar el documento. Verifica que el servicio esté disponible."
          }
          
          throw new Error(errorMessage)
        }

        // Chunk the markdown content with process-specific settings (500-800 tokens)
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: PROCESS_CHUNK_SIZE,
          chunkOverlap: PROCESS_CHUNK_OVERLAP
        })

        const splitDocs = await splitter.createDocuments([markdownContent])

        // Generate embeddings for all chunks
        const chunkTexts = splitDocs.map(doc => doc.pageContent)
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunkTexts
        })

        const embeddings = embeddingResponse.data.map(item => item.embedding)

        // Prepare metadata for document (including Docling rawJson if available)
        // Store rawJson at document level, not in each chunk (more efficient)
        const documentMetadata: any = {
          ...(document.metadata || {}),
          file_name: document.file_name,
          processed_with: "docling",
          processed_at: new Date().toISOString()
        }
        
        // Store Docling rawJson in document metadata (not in each chunk)
        if (doclingRawJson) {
          // Limit size to avoid JSONB limits (typically 1GB, but be conservative)
          // Store a summary or truncated version if too large
          try {
            const jsonString = JSON.stringify(doclingRawJson)
            if (jsonString.length > 1000000) { // 1MB limit
              console.warn(`⚠️ Docling rawJson is large (${jsonString.length} bytes), storing summary only`)
              documentMetadata.docling_raw = {
                summary: "Document structure available",
                size: jsonString.length,
                truncated: true
              }
            } else {
              documentMetadata.docling_raw = doclingRawJson
            }
          } catch (jsonError) {
            console.warn(`⚠️ Could not serialize Docling rawJson:`, jsonError)
            documentMetadata.docling_raw = { error: "Could not serialize" }
          }
        }

        // Save chunks to process_document_sections
        // Only include chunk-specific metadata, not the full rawJson
        const sectionsToInsert = splitDocs.map((doc, index) => ({
          process_id: processId,
          document_id: document.id,
          user_id: user.id,
          content: doc.pageContent,
          tokens: encode(doc.pageContent).length,
          openai_embedding: embeddings[index] as any,
          metadata: {
            chunk_index: index,
            total_chunks: splitDocs.length,
            file_name: document.file_name
            // Note: Docling-specific metadata (page, block type, etc.) could be added here
            // if extracted from rawJson, but we keep it minimal for now
          }
        }))

        const { error: insertError } = await supabaseAdmin
          .from("process_document_sections")
          .insert(sectionsToInsert)

        if (insertError) {
          throw new Error(`Error guardando chunks: ${insertError.message}`)
        }

        // Update document status to indexed and save metadata (including Docling rawJson)
        const { error: indexedError } = await supabaseAdmin
          .from("process_documents")
          .update({ 
            status: "indexed",
            error_message: null,
            metadata: documentMetadata,
            updated_at: new Date().toISOString()
          })
          .eq("id", document.id)

        if (indexedError) {
          console.error(`❌ Error updating document status to indexed:`, indexedError)
          throw new Error(`Error actualizando estado a indexed: ${indexedError.message}`)
        }

        console.log(`✅ Documento ${document.file_name} indexado correctamente (${sectionsToInsert.length} chunks)`)

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

