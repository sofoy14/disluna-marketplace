import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { linkTranscriptionToProcess, unlinkTranscriptionFromProcess } from "@/db/transcriptions"
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

    if (action === "link") {
      await linkTranscriptionToProcess(transcription_id, process_id, profile.user_id)
      return NextResponse.json({ success: true, message: "Transcription linked to process" })
    } else if (action === "unlink") {
      await unlinkTranscriptionFromProcess(transcription_id, process_id)
      return NextResponse.json({ success: true, message: "Transcription unlinked from process" })
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'link' or 'unlink'" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error linking transcription to process:", error)
    return NextResponse.json(
      { error: error.message || "Failed to link transcription to process" },
      { status: 500 }
    )
  }
}

