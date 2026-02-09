/**
 * S3 Key Builder
 * 
 * Generates S3 object keys following a consistent naming convention
 */

import { StorageKeyOptions } from "./types"

export class S3KeyBuilder {
  private static readonly PREFIXES = {
    DOCUMENTS: "documents",
    TRANSCRIPTIONS: "transcriptions",
    WORKSPACE_IMAGES: "workspace-images",
    TEMP: "temp",
  } as const

  /**
   * Build S3 key for process document
   * Format: documents/workspaces/{workspaceId}/processes/{processId}/{documentId}.{ext}
   */
  static buildDocumentKey(options: StorageKeyOptions): string {
    const extension = options.fileName
      ? options.fileName.split(".").pop() || "bin"
      : "bin"

    const documentId = options.documentId || crypto.randomUUID()
    const processId = options.processId || "general"

    const parts = [
      this.PREFIXES.DOCUMENTS,
      "workspaces",
      options.workspaceId,
      "processes",
      processId,
      `${documentId}.${extension}`,
    ]

    return parts.join("/")
  }

  /**
   * Build S3 key for transcription audio
   * Format: transcriptions/workspaces/{workspaceId}/{transcriptionId}.{ext}
   */
  static buildTranscriptionKey(options: {
    workspaceId: string
    transcriptionId: string
    extension: string
  }): string {
    return [
      this.PREFIXES.TRANSCRIPTIONS,
      "workspaces",
      options.workspaceId,
      `${options.transcriptionId}.${options.extension}`,
    ].join("/")
  }

  /**
   * Build S3 key for workspace image
   * Format: workspace-images/{workspaceId}.{ext}
   */
  static buildWorkspaceImageKey(options: {
    workspaceId: string
    extension: string
  }): string {
    return [
      this.PREFIXES.WORKSPACE_IMAGES,
      `${options.workspaceId}.${options.extension}`,
    ].join("/")
  }

  /**
   * Build S3 key for temporary upload
   * Format: temp/uploads/{userId}/{sessionId}/{filename}
   */
  static buildTempKey(options: {
    userId: string
    sessionId: string
    fileName: string
  }): string {
    return [
      this.PREFIXES.TEMP,
      "uploads",
      options.userId,
      options.sessionId,
      options.fileName,
    ].join("/")
  }

  /**
   * Parse S3 key to extract metadata
   */
  static parseKey(key: string): {
    type: "document" | "transcription" | "workspace-image" | "temp"
    workspaceId?: string
    processId?: string
    documentId?: string
    extension?: string
    userId?: string
  } {
    const parts = key.split("/")
    const filename = parts[parts.length - 1]
    const extension = filename.includes(".")
      ? filename.split(".").pop()
      : undefined

    if (parts[0] === this.PREFIXES.DOCUMENTS) {
      return {
        type: "document",
        workspaceId: parts[2],
        processId: parts[4] !== "general" ? parts[4] : undefined,
        documentId: filename.split(".")[0],
        extension,
      }
    }

    if (parts[0] === this.PREFIXES.TRANSCRIPTIONS) {
      return {
        type: "transcription",
        workspaceId: parts[2],
        documentId: filename.split(".")[0],
        extension,
      }
    }

    if (parts[0] === this.PREFIXES.WORKSPACE_IMAGES) {
      return {
        type: "workspace-image",
        workspaceId: filename.split(".")[0],
        extension,
      }
    }

    if (parts[0] === this.PREFIXES.TEMP) {
      return {
        type: "temp",
        userId: parts[2],
      }
    }

    return { type: "temp" }
  }

  /**
   * Validate that a key follows the expected format
   */
  static isValidKey(key: string): boolean {
    if (!key || typeof key !== "string") return false
    if (key.length < 10) return false // Minimum length check
    if (key.includes("..")) return false // Prevent directory traversal
    if (!/^[a-zA-Z0-9/_\-.$]+$/.test(key)) return false // Valid characters only

    const validPrefixes = Object.values(this.PREFIXES)
    const hasValidPrefix = validPrefixes.some(prefix =>
      key.startsWith(prefix + "/")
    )

    return hasValidPrefix
  }
}
