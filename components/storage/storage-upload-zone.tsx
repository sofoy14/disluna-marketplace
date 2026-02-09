/**
 * Storage Upload Zone Component
 * 
 * Upload zone with quota validation and progress indication
 */

"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useStorageQuota } from "@/lib/hooks/use-storage-quota"
import { useFileUpload } from "@/lib/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  AlertTriangle,
  File,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StorageUploadZoneProps {
  workspaceId: string
  processId?: string
  onUploadComplete?: (document: any) => void
  onUploadError?: (error: any) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
}

const DEFAULT_ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/msword": [".doc"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "application/json": [".json"],
}

export function StorageUploadZone({
  workspaceId,
  processId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedFileTypes,
}: StorageUploadZoneProps) {
  const {
    quota,
    loading: quotaLoading,
    canUpload,
    isAtLimit,
    hasAvailableSpace,
  } = useStorageQuota()
  const {
    upload,
    uploading,
    progress,
    error: uploadError,
    reset,
  } = useFileUpload()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      // Check quota for first file
      const file = acceptedFiles[0]
      if (!hasAvailableSpace(file.size)) {
        onUploadError?.({
          error: "Storage quota exceeded",
          message: "No tienes suficiente espacio para subir este archivo",
        })
        return
      }

      const result = await upload(file, {
        workspaceId,
        processId,
      })

      if (result.success) {
        onUploadComplete?.(result.document)
        reset()
      } else {
        onUploadError?.(result)
      }
    },
    [workspaceId, processId, upload, hasAvailableSpace, onUploadComplete, onUploadError, reset]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: acceptedFileTypes
        ? acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {})
        : DEFAULT_ACCEPTED_TYPES,
      maxFiles,
      disabled: uploading || isAtLimit || quotaLoading,
      maxSize: 50 * 1024 * 1024, // 50MB
    })

  // Show quota limit message
  if (isAtLimit) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Has alcanzado tu límite de almacenamiento.</span>
          <Link href="/precios">
            <Button size="sm" variant="outline">
              Actualizar plan
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  // Show no storage message
  if (!quotaLoading && quota && !quota.plan.hasStorage) {
    return (
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Tu plan no incluye almacenamiento de archivos.</span>
          <Link href="/precios">
            <Button size="sm">Ver planes</Button>
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          (uploading || isAtLimit) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500" />
            <div className="space-y-2">
              <Progress value={progress} className="w-full max-w-xs mx-auto" />
              <p className="text-sm text-gray-600">Subiendo archivo...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDragActive
                  ? "Suelta los archivos aquí"
                  : "Arrastra archivos aquí o haz clic para seleccionar"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, DOCX, TXT, CSV, JSON (máx. 50MB)
              </p>
            </div>
            {quota && quota.plan.hasStorage && !quota.isUnlimited && (
              <p className="text-xs text-gray-500">
                Espacio disponible: {quota.formatted.remaining}
              </p>
            )}
          </div>
        )}
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {fileRejections.map(({ file, errors }) => (
                <li key={file.name}>
                  {file.name}: {errors.map((e) => e.message).join(", ")}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive">
          <X className="w-4 h-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
