import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { getTranscriptionsByUserId } from "@/db/transcriptions"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const profile = await getServerProfile()
    
    const transcriptions = await getTranscriptionsByUserId(profile.user_id)
    
    return NextResponse.json({
      success: true,
      transcriptions
    })
  } catch (error: any) {
    console.error("Error fetching transcriptions:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch transcriptions" },
      { status: 500 }
    )
  }
}





