/**
 * Storage Service
 * 
 * Main service for file storage operations with quota management
 */

import { WasabiS3Provider } from "./providers/wasabi-s3-provider"
import { QuotaService } from "./quota-service"
import {
  StorageProvider,
  UploadFileParams,
  UploadResult,
  StorageQuota,
  QuotaCheckResult,
  StorageServiceConfig,
} from "./types"

export class StorageService {
  private provider: StorageProvider
  private quotaService: QuotaService

  constructor(config: StorageServiceConfig) {
    if (config.provider === "wasabi" && config.wasabiConfig) {
      this.provider = new WasabiS3Provider(config.wasabiConfig)
    } else {
      throw new Error("Invalid storage configuration")
    }

    this.quotaService = new QuotaService()
  }

  /**
   * Upload file with quota validation
   */
  async uploadFile(
    params: UploadFileParams & { skipQuotaCheck?: boolean }
  ): Promise<UploadResult> {
    const fileSize = this.getFileSize(params.file)

    // 1. Check quota before upload (unless skipped for migrations)
    if (!params.skipQuotaCheck) {
      const quotaCheck = await this.quotaService.checkQuota(
        params.userId,
        fileSize
      )

      if (!quotaCheck.allowed) {
        throw new Error(`Storage quota exceeded: ${quotaCheck.message}`)
      }
    }

    // 2. Upload to storage
    const result = await this.provider.upload(params)

    // 3. Update quota usage
    try {
      await this.quotaService.incrementUsage(params.userId, result.size)
    } catch (error) {
      // Rollback: delete from S3 if quota update fails
      await this.provider.delete(result.key).catch(console.error)
      throw new Error("Failed to update storage quota after upload")
    }

    return result
  }

  /**
   * Delete file and update quota
   */
  async deleteFile(params: {
    key: string
    userId: string
    sizeBytes: number
  }): Promise<void> {
    // 1. Delete from storage
    await this.provider.delete(params.key)

    // 2. Update quota
    await this.quotaService.decrementUsage(params.userId, params.sizeBytes)
  }

  /**
   * Get download URL (presigned)
   */
  async getDownloadUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getDownloadUrl(key, expiresIn)
  }

  /**
   * Check quota for upload
   */
  async checkQuota(
    userId: string,
    requestedBytes: number
  ): Promise<QuotaCheckResult> {
    return this.quotaService.checkQuota(userId, requestedBytes)
  }

  /**
   * Get full quota status
   */
  async getQuotaStatus(userId: string): Promise<StorageQuota | null> {
    return this.quotaService.getQuotaStatus(userId)
  }

  /**
   * Get file metadata from storage
   */
  async getFileMetadata(key: string) {
    return this.provider.getFileMetadata(key)
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key)
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    return this.quotaService.formatBytes(bytes)
  }

  private getFileSize(file: Buffer | Uint8Array | ReadableStream): number {
    if (file instanceof Buffer) return file.length
    if (file instanceof Uint8Array) return file.byteLength
    return 0
  }
}

/**
 * Create storage service from environment variables
 */
export function createStorageService(): StorageService {
  const provider = process.env.STORAGE_PROVIDER as "wasabi" | "supabase"

  if (provider === "wasabi") {
    const config = {
      endpoint: process.env.WASABI_ENDPOINT!,
      region: process.env.WASABI_REGION!,
      bucket: process.env.WASABI_BUCKET!,
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
      multipartThresholdMB: parseInt(
        process.env.WASABI_MULTIPART_THRESHOLD_MB || "5"
      ),
    }

    // Validate config
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error(
        "Missing Wasabi configuration. Check environment variables."
      )
    }

    return new StorageService({
      provider: "wasabi",
      wasabiConfig: config,
    })
  }

  throw new Error(`Unsupported storage provider: ${provider}`)
}

// Export singleton instance (created lazily to allow env loading)
let storageServiceInstance: StorageService | null = null

export function getStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = createStorageService()
  }
  return storageServiceInstance
}

// Reset instance (useful for testing)
export function resetStorageService(): void {
  storageServiceInstance = null
}
