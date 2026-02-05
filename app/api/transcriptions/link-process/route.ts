export const dynamic = 'force-dynamic'

import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { getSupabaseServer } from "@/lib/supabase/server-client"
import { assertProcessAccess } from "@/lib/server/access/processes"
import { ForbiddenError, NotFoundError } from "@/lib/server/errors"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const profile = await getServerProfile()
    const body = await request.json()
    const { transcription_id, process_id, action = "link" } = body

    if (!transcription_id || !process_id) {
      return NextResponse.json(
        { error: "transcription_id and process_id are required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseServer()

    const { data: transcription, error: transcriptionError } = await supabaseAdmin
      .from("transcriptions")
      .select("id,user_id,workspace_id")
      .eq("id", transcription_id)
      .maybeSingle()

    if (transcriptionError) {
      return NextResponse.json(
        { error: transcriptionError.message },
        { status: 500 }
      )
    }

    if (!transcription) {
      return NextResponse.json({ error: "Transcription not found" }, { status: 404 })
    }

    if (transcription.user_id !== profile.user_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let processRecord: any
    try {
      const result = await assertProcessAccess(supabaseAdmin, process_id, profile.user_id)
      processRecord = result.process
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return NextResponse.json({ error: "Process not found" }, { status: 404 })
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      throw error
    }

    if (
      transcription.workspace_id &&
      processRecord?.workspace_id &&
      transcription.workspace_id !== processRecord.workspace_id
    ) {
      return NextResponse.json(
        { error: "Transcription and process are in different workspaces" },
        { status: 400 }
      )
    }

    if (action === "link") {
      const { error } = await supabaseAdmin.from("process_transcriptions").upsert({
        transcription_id,
        process_id,
        user_id: profile.user_id,
        updated_at: new Date().toISOString()
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Transcription linked to process"
      })
    }

    if (action === "unlink") {
      const { error } = await supabaseAdmin
        .from("process_transcriptions")
        .delete()
        .eq("transcription_id", transcription_id)
        .eq("process_id", process_id)
        .eq("user_id", profile.user_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Transcription unlinked from process"
      })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'link' or 'unlink'" },
      { status: 400 }
    )
  } catch (error: any) {
    console.error("Error linking transcription to process:", error)
    return NextResponse.json(
      { error: error.message || "Failed to link transcription to process" },
      { status: 500 }
    )
  }
}

