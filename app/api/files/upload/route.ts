/**
 * File Upload API Route
 * 
 * Handles file uploads to Wasabi S3 with quota validation
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getStorageService } from "@/lib/storage"
import { S3KeyBuilder } from "@/lib/storage/key-builder"
import { z } from "zod"

const uploadSchema = z.object({
  workspaceId: z.string().uuid(),
  processId: z.string().uuid().optional(),
})

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
])

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "txt",
  "md",
  "csv",
  "json",
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
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

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const workspaceId = formData.get("workspaceId") as string
    const processId = (formData.get("processId") as string) || undefined

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: "Missing file or workspaceId" },
        { status: 400 }
      )
    }

    // 3. Validate file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    const hasAllowedMime = ALLOWED_TYPES.has(file.type)
    const hasAllowedExt =
      fileExtension && ALLOWED_EXTENSIONS.has(fileExtension)

    if (!hasAllowedMime && !hasAllowedExt) {
      return NextResponse.json(
        {
          error: "Invalid file type",
          allowedTypes: Array.from(ALLOWED_EXTENSIONS),
        },
        { status: 400 }
      )
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    // 5. Check workspace access
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      )
    }

    // 6. Verify process access if processId provided
    if (processId) {
      const { data: process, error: processError } = await supabase
        .from("processes")
        .select("id")
        .eq("id", processId)
        .eq("workspace_id", workspaceId)
        .single()

      if (processError || !process) {
        return NextResponse.json(
          { error: "Process not found or access denied" },
          { status: 403 }
        )
      }
    }

    // 7. Check storage quota BEFORE processing
    const storageService = getStorageService()
    const quotaCheck = await storageService.checkQuota(user.id, file.size)

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: "Storage quota exceeded",
          details: quotaCheck.message,
          currentUsage: quotaCheck.currentUsage,
          limit: quotaCheck.limit,
          remaining: quotaCheck.remaining,
          upgradeUrl: "/precios",
        },
        { status: 403 }
      )
    }

    // 8. Build S3 key
    const documentId = crypto.randomUUID()
    const s3Key = S3KeyBuilder.buildDocumentKey({
      workspaceId,
      processId,
      documentId,
      userId: user.id,
      fileName: file.name,
    })

    // 9. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 10. Upload to S3
    const uploadResult = await storageService.uploadFile({
      file: buffer,
      key: s3Key,
      contentType: file.type || "application/octet-stream",
      metadata: {
        "original-filename": file.name,
        "uploaded-by": user.id,
        "workspace-id": workspaceId,
        ...(processId && { "process-id": processId }),
      },
      userId: user.id,
      workspaceId,
      processId,
    })

    // 11. Create database record
    const { data: document, error: dbError } = await supabase
      .from("process_documents")
      .insert({
        id: documentId,
        process_id: processId,
        user_id: user.id,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_provider: "wasabi",
        storage_key: s3Key,
        status: "pending",
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (dbError) {
      // Rollback: delete from S3
      await storageService
        .deleteFile({
          key: s3Key,
          userId: user.id,
          sizeBytes: file.size,
        })
        .catch(console.error)

      throw dbError
    }

    // 12. Update process status to processing
    if (processId) {
      await supabase
        .from("processes")
        .update({ indexing_status: "processing" })
        .eq("id", processId)
        .eq("indexing_status", "pending")
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.file_name,
        size: document.size_bytes,
        storageKey: document.storage_key,
        status: document.status,
      },
      quota: {
        used: quotaCheck.currentUsage + file.size,
        limit: quotaCheck.limit,
        remaining: quotaCheck.remaining - file.size,
        formatted: {
          used: storageService.formatBytes(quotaCheck.currentUsage + file.size),
          limit: storageService.formatBytes(quotaCheck.limit),
          remaining: storageService.formatBytes(
            quotaCheck.remaining - file.size
          ),
        },
      },
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
