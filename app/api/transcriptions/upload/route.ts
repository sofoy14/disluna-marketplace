import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const maxDuration = 300 // 5 minutos para upload de archivos grandes

export async function POST(request: Request) {
  try {
    const profile = await getServerProfile()
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const workspace_id = formData.get("workspace_id") as string

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validar formato de audio
    const validAudioFormats = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/ogg", "audio/x-m4a", "audio/mp3"]
    if (!validAudioFormats.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid audio format. Supported: MP3, WAV, M4A, OGG, WEBM" },
        { status: 400 }
      )
    }

    // Limitar tamaño (100MB por defecto, ajustar según necesidad)
    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Subir archivo a Supabase Storage usando el cliente admin
    const fileName = `${profile.user_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = fileName

    const { error: uploadError } = await supabaseAdmin.storage
      .from("files")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      console.error("Error uploading file to storage:", uploadError)
      throw new Error(`Failed to upload file: ${uploadError.message}`)
    }

    // Crear registro de transcripción usando el cliente admin
    const { data: transcription, error: transcriptionError } = await supabaseAdmin
      .from("transcriptions")
      .insert({
        user_id: profile.user_id,
        workspace_id: workspace_id || null,
        name: name || file.name,
        audio_path: filePath,
        file_size: file.size,
        audio_format: file.type,
        status: "pending",
        description: description || null
      })
      .select("*")
      .single()

    if (transcriptionError || !transcription) {
      console.error("Error creating transcription:", transcriptionError)
      throw new Error(`Failed to create transcription: ${transcriptionError?.message || "Unknown error"}`)
    }

    // NOTA: En producción deberías usar un job queue (ej: Bull, pg-boss)
    // Por ahora, el frontend llamará a /api/transcriptions/transcribe después de subir
    console.log(`📝 Transcription ${transcription.id} ready for processing`)

    return NextResponse.json({
      success: true,
      transcription
    })

  } catch (error: any) {
    console.error("Error uploading transcription:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload audio file" },
      { status: 500 }
    )
  }
}

