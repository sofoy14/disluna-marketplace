/**
 * useFileUpload Hook
 * 
 * React hook for uploading files with quota validation
 */

import { useState, useCallback } from "react"

export interface UploadOptions {
  workspaceId: string
  processId?: string
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  success: boolean
  document?: {
    id: string
    name: string
    size: number
    storageKey: string
    status: string
  }
  quota?: {
    used: number
    limit: number
    remaining: number
    formatted: {
      used: string
      limit: string
      remaining: string
    }
  }
  error?: string
  details?: any
}

interface UseFileUploadReturn {
  upload: (file: File, options: UploadOptions) => Promise<UploadResult>
  uploading: boolean
  progress: number
  error: string | null
  reset: () => void
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult> => {
      try {
        setUploading(true)
        setProgress(0)
        setError(null)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("workspaceId", options.workspaceId)
        if (options.processId) {
          formData.append("processId", options.processId)
        }

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Upload failed")
          return {
            success: false,
            error: data.error,
            details: data,
          }
        }

        setProgress(100)
        return {
          success: true,
          document: data.document,
          quota: data.quota,
        }
      } catch (err: any) {
        const message = err.message || "Upload failed"
        setError(message)
        return {
          success: false,
          error: message,
        }
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  }
}
