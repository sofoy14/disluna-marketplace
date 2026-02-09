/**
 * File Download API Route
 * 
 * Generates presigned URL for downloading files from Wasabi S3
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getStorageService } from "@/lib/storage"

const DEFAULT_EXPIRY = 3600 // 1 hour
const MAX_EXPIRY = 86400 // 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documentId = params.id
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      )
    }

    // 2. Get document from database
    const { data: document, error: docError } = await supabase
      .from("process_documents")
      .select("*, processes(workspace_id)")
      .eq("id", documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // 3. Verify access (user must own the document or have workspace access)
    const workspaceId = document.processes?.workspace_id
    if (document.user_id !== user.id && workspaceId) {
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    }

    // 4. Check if document is stored in Wasabi
    if (document.storage_provider !== "wasabi" || !document.storage_key) {
      return NextResponse.json(
        { error: "Document not available for download" },
        { status: 400 }
      )
    }

    // 5. Get expiry from query params (optional)
    const { searchParams } = new URL(request.url)
    const requestedExpiry = parseInt(
      searchParams.get("expiry") || String(DEFAULT_EXPIRY)
    )
    const expiry = Math.min(requestedExpiry, MAX_EXPIRY)

    // 6. Generate presigned URL
    const storageService = getStorageService()
    const downloadUrl = await storageService.getDownloadUrl(
      document.storage_key,
      expiry
    )

    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresIn: expiry,
      document: {
        id: document.id,
        name: document.file_name,
        size: document.size_bytes,
        mimeType: document.mime_type,
      },
    })
  } catch (error: any) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Failed to generate download URL", details: error.message },
      { status: 500 }
    )
  }
}
