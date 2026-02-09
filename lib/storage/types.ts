/**
 * Storage Types and Interfaces
 * 
 * Defines all types used by the storage system
 */

export interface StorageConfig {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  maxFileSizeMB: number
  presignedUrlExpirySeconds: number
  multipartThresholdMB?: number
}

export interface UploadFileParams {
  file: Buffer | Uint8Array | ReadableStream
  key: string
  contentType: string
  metadata?: Record<string, string>
  userId: string
  workspaceId?: string
  processId?: string
  skipQuotaCheck?: boolean
}

export interface UploadResult {
  key: string
  etag: string
  location: string
  size: number
  metadata?: Record<string, string>
}

export interface StorageQuota {
  userId: string
  usedBytes: number
  limitBytes: number
  remainingBytes: number
  isUnlimited: boolean
  documentsCount: number
  periodStart: Date
  periodEnd: Date
}

export interface QuotaCheckResult {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
  message: string
}

export interface FileMetadata {
  size: number
  contentType: string
  lastModified: Date
  metadata: Record<string, string>
}

export interface StorageProvider {
  upload(params: UploadFileParams): Promise<UploadResult>
  delete(key: string): Promise<void>
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>
  getFileMetadata(key: string): Promise<FileMetadata>
  exists(key: string): Promise<boolean>
}

export interface StorageKeyOptions {
  workspaceId: string
  processId?: string
  documentId?: string
  userId?: string
  fileName?: string
}

export interface StorageServiceConfig {
  provider: "wasabi" | "supabase"
  wasabiConfig?: {
    endpoint: string
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    multipartThresholdMB?: number
  }
}

// Storage quota from database
export interface StorageQuotaDB {
  id: string
  user_id: string
  workspace_id: string | null
  storage_limit_bytes: number
  storage_used_bytes: number
  documents_count: number
  period_start: string
  period_end: string
  created_at: string
  updated_at: string
}

// Plan storage limits
export interface PlanStorageLimits {
  planType: "basic" | "pro" | "enterprise"
  maxStorageBytes: number
}
