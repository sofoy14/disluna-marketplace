/**
 * File Delete API Route
 * 
 * Deletes files from Wasabi S3 and updates quota
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getStorageService } from "@/lib/storage"

export async function DELETE(
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

    // 3. Verify ownership
    const workspaceId = document.processes?.workspace_id
    const isOwner = document.user_id === user.id

    // Check workspace permissions if not owner
    if (!isOwner && workspaceId) {
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single()

      // Only allow admins and owners to delete other's files
      if (!membership || !["admin", "owner"].includes(membership.role)) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }
    } else if (!isOwner) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // 4. Delete from S3 if stored in Wasabi
    if (document.storage_provider === "wasabi" && document.storage_key) {
      const storageService = getStorageService()

      try {
        await storageService.deleteFile({
          key: document.storage_key,
          userId: user.id,
          sizeBytes: document.size_bytes || 0,
        })
      } catch (s3Error: any) {
        // Log error but continue with DB deletion
        console.error("S3 delete error:", s3Error)
        // If file doesn't exist in S3, we can still delete from DB
        if (!s3Error.message?.includes("NotFound")) {
          throw s3Error
        }
      }
    }

    // 5. Delete from database
    const { error: deleteError } = await supabase
      .from("process_documents")
      .delete()
      .eq("id", documentId)

    if (deleteError) {
      throw deleteError
    }

    // 6. Also delete related sections if any
    await supabase
      .from("process_document_sections")
      .delete()
      .eq("document_id", documentId)

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      documentId,
      quotaReleased: document.size_bytes || 0,
    })
  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete document", details: error.message },
      { status: 500 }
    )
  }
}
