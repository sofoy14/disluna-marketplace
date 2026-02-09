/**
 * Storage Module
 * 
 * Main exports for the storage system
 */

// Types
export type {
  StorageConfig,
  UploadFileParams,
  UploadResult,
  StorageQuota,
  QuotaCheckResult,
  FileMetadata,
  StorageProvider,
  StorageKeyOptions,
  StorageServiceConfig,
} from "./types"

// Services
export {
  StorageService,
  createStorageService,
  getStorageService,
  resetStorageService,
} from "./storage-service"

export { QuotaService, quotaService } from "./quota-service"

// Providers
export { WasabiS3Provider } from "./providers/wasabi-s3-provider"

// Utils
export { S3KeyBuilder } from "./key-builder"
