/**
 * Wasabi S3 Provider
 * 
 * Implementation of StorageProvider for Wasabi S3-compatible storage
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Upload } from "@aws-sdk/lib-storage"
import {
  StorageProvider,
  UploadFileParams,
  UploadResult,
  FileMetadata,
} from "../types"

export interface WasabiS3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  multipartThresholdMB?: number
}

export class WasabiS3Provider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private multipartThreshold: number

  constructor(config: WasabiS3Config) {
    this.bucket = config.bucket
    this.multipartThreshold =
      (config.multipartThresholdMB || 5) * 1024 * 1024 // Default 5MB

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // Required for Wasabi
      maxAttempts: 3,
    })
  }

  async upload(params: UploadFileParams): Promise<UploadResult> {
    const fileSize = this.getFileSize(params.file)

    const metadata: Record<string, string> = {
      "user-id": params.userId,
      "upload-date": new Date().toISOString(),
      ...(params.workspaceId && { "workspace-id": params.workspaceId }),
      ...(params.processId && { "process-id": params.processId }),
      ...params.metadata,
    }

    try {
      let result: { ETag?: string }

      if (fileSize > this.multipartThreshold) {
        result = await this.uploadMultipart(params, metadata)
      } else {
        result = await this.uploadSingle(params, metadata)
      }

      return {
        key: params.key,
        etag: result.ETag || "",
        location: `s3://${this.bucket}/${params.key}`,
        size: fileSize,
        metadata,
      }
    } catch (error) {
      console.error("S3 upload error:", error)
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  private async uploadSingle(
    params: UploadFileParams,
    metadata: Record<string, string>
  ): Promise<{ ETag?: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.file,
      ContentType: params.contentType,
      Metadata: metadata,
      ServerSideEncryption: "AES256",
    })

    return this.client.send(command)
  }

  private async uploadMultipart(
    params: UploadFileParams,
    metadata: Record<string, string>
  ): Promise<{ ETag?: string }> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: params.key,
        Body: params.file,
        ContentType: params.contentType,
        Metadata: metadata,
        ServerSideEncryption: "AES256",
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024, // 5MB per part
    })

    const result = await upload.done()
    return { ETag: result.ETag }
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
  }

  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: "attachment",
    })

    return getSignedUrl(this.client, command, { expiresIn })
  }

  async getFileMetadata(key: string): Promise<FileMetadata> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const response = await this.client.send(command)

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key)
      return true
    } catch (error: any) {
      if (error.name === "NotFound" || error.name === "NoSuchKey") {
        return false
      }
      throw error
    }
  }

  private getFileSize(file: Buffer | Uint8Array | ReadableStream): number {
    if (file instanceof Buffer) {
      return file.length
    }
    if (file instanceof Uint8Array) {
      return file.byteLength
    }
    // For streams, size must be known beforehand
    return 0
  }
}
