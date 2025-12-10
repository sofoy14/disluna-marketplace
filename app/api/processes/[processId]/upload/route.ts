import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"

export async function POST(
  request: Request,
  { params }: { params: { processId: string } }
) {
  try {
    console.log("📤 Starting document upload process...")
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
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
    console.log("📋 Process ID:", processId)

    // Create admin client for storage operations
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing Supabase environment variables")
      throw new Error("Missing Supabase configuration")
    }

    const supabaseAdmin = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Verify user has access to the process using admin client
    const { data: processRecord, error: processError } = await supabaseAdmin
      .from("processes")
      .select("*")
      .eq("id", processId)
      .single()

    if (processError) {
      console.error("❌ Error fetching process:", processError)
      return NextResponse.json(
        { error: "Proceso no encontrado", details: processError.message },
        { status: 404 }
      )
    }

    if (!processRecord) {
      console.error("❌ Process not found")
      return NextResponse.json(
        { error: "Proceso no encontrado" },
        { status: 404 }
      )
    }

    if (processRecord.user_id !== user.id) {
      console.error("❌ User does not have access to process")
      return NextResponse.json(
        { error: "No tienes acceso a este proceso" },
        { status: 403 }
      )
    }

    console.log("✅ Process access verified")

    // Parse FormData
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    console.log(`📁 Files received: ${files.length}`)

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron archivos" },
        { status: 400 }
      )
    }

    const uploadedDocuments = []

    // Process each file
    for (const file of files) {
      console.log(`📄 Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`)
      
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json"
      ]

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|txt|md|csv|json)$/i)) {
        console.warn(`⚠️ File type not allowed: ${file.type} for ${file.name}`)
        continue
      }

      // Generate file ID and storage path
      const fileId = crypto.randomUUID()
      const filePath = `${user.id}/${Buffer.from(fileId).toString("base64")}`
      console.log(`📦 Storage path: ${filePath}`)

      // Upload to storage using admin client
      console.log("⬆️ Uploading to storage...")
      const { error: uploadError } = await supabaseAdmin.storage
        .from("files")
        .upload(filePath, file, {
          upsert: true
        })

      if (uploadError) {
        console.error(`❌ Error uploading file ${file.name} to storage:`, uploadError)
        continue
      }

      console.log("✅ File uploaded to storage")

      // Create process_document record using admin client
      const documentData = {
        process_id: processId,
        user_id: user.id,
        file_name: file.name,
        storage_path: filePath,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        status: "pending",
        metadata: {}
      }

      console.log("💾 Creating process_document record:", documentData)

      const { data: createdDocument, error: docError } = await supabaseAdmin
        .from("process_documents")
        .insert([documentData])
        .select("*")
        .single()

      if (docError) {
        console.error(`❌ Error creating process_document for ${file.name}:`, docError)
        console.error("Document data:", documentData)
        continue
      }

      console.log("✅ Process document created:", createdDocument?.id)
      uploadedDocuments.push(createdDocument)
    }

    if (uploadedDocuments.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron subir archivos válidos" },
        { status: 400 }
      )
    }

    // Update process indexing_status to 'processing' if it was 'pending'
    const { error: updateError } = await supabase
      .from("processes")
      .update({ indexing_status: "processing" })
      .eq("id", processId)
      .eq("indexing_status", "pending")

    if (updateError) {
      console.error("Error updating process status:", updateError)
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
      message: `${uploadedDocuments.length} documento(s) subido(s) correctamente`
    })

  } catch (error: any) {
    console.error("❌ Error uploading documents:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: "Error al subir documentos",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

