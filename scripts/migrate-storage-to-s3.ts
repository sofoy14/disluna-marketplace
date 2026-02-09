/**
 * Storage Migration Script
 * 
 * Migrates files from Supabase Storage to Wasabi S3
 * Usage: npx ts-node scripts/migrate-storage-to-s3.ts
 */

import { createClient } from "@supabase/supabase-js"
import { getStorageService } from "../lib/storage"
import { S3KeyBuilder } from "../lib/storage/key-builder"

require("dotenv").config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MigrationResult {
  success: boolean
  documentId: string
  oldPath: string
  newKey: string
  size: number
  error?: string
}

interface MigrationOptions {
  dryRun?: boolean
  batchSize?: number
  startFrom?: string
  onlyProcessId?: string
  onlyWorkspaceId?: string
}

class StorageMigration {
  private results: MigrationResult[] = []
  private batchSize: number
  private dryRun: boolean
  private startFrom?: string
  private onlyProcessId?: string
  private onlyWorkspaceId?: string

  constructor(options: MigrationOptions = {}) {
    this.dryRun = options.dryRun || false
    this.batchSize = options.batchSize || 20
    this.startFrom = options.startFrom
    this.onlyProcessId = options.onlyProcessId
    this.onlyWorkspaceId = options.onlyWorkspaceId
  }

  async migrateAll(): Promise<void> {
    console.log("🚀 Starting migration to Wasabi S3...\n")

    if (this.dryRun) {
      console.log("🏃 DRY RUN MODE - No actual changes will be made\n")
    }

    // Get documents to migrate
    let query = supabase
      .from("process_documents")
      .select(
        "id, process_id, user_id, storage_path, file_name, size_bytes, mime_type, storage_provider"
      )
      .or("storage_provider.eq.supabase,storage_provider.is.null")

    if (this.startFrom) {
      query = query.gt("id", this.startFrom)
    }

    if (this.onlyProcessId) {
      query = query.eq("process_id", this.onlyProcessId)
    }

    const { data: documents, error } = await query.order("id")

    if (error) {
      console.error("❌ Failed to fetch documents:", error)
      throw error
    }

    if (!documents || documents.length === 0) {
      console.log("✅ No documents to migrate")
      return
    }

    console.log(`📦 Found ${documents.length} documents to migrate\n`)

    // Process in batches
    for (let i = 0; i < documents.length; i += this.batchSize) {
      const batch = documents.slice(i, i + this.batchSize)
      const batchNum = Math.floor(i / this.batchSize) + 1
      const totalBatches = Math.ceil(documents.length / this.batchSize)

      console.log(`\n🔄 Processing batch ${batchNum}/${totalBatches}`)
      await this.processBatch(batch)

      // Progress update
      const progress = ((i + batch.length) / documents.length) * 100
      console.log(`   Progress: ${progress.toFixed(1)}%`)
    }

    this.printReport()
  }

  private async processBatch(documents: any[]): Promise<void> {
    for (const doc of documents) {
      await this.migrateDocument(doc)
    }
  }

  private async migrateDocument(doc: any): Promise<void> {
    const startTime = Date.now()

    try {
      // 1. Get workspace ID
      const { data: process, error: processError } = await supabase
        .from("processes")
        .select("workspace_id")
        .eq("id", doc.process_id)
        .single()

      if (processError || !process) {
        throw new Error(`Process not found: ${processError?.message}`)
      }

      // Filter by workspace if specified
      if (this.onlyWorkspaceId && process.workspace_id !== this.onlyWorkspaceId) {
        return
      }

      // 2. Download from Supabase Storage
      console.log(`  ⬇️  Downloading: ${doc.file_name}`)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("files")
        .download(doc.storage_path)

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message}`)
      }

      // 3. Convert to buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Verify size matches
      if (buffer.length !== doc.size_bytes && doc.size_bytes > 0) {
        console.warn(
          `    ⚠️ Size mismatch: expected ${doc.size_bytes}, got ${buffer.length}`
        )
      }

      // 4. Build S3 key
      const s3Key = S3KeyBuilder.buildDocumentKey({
        workspaceId: process.workspace_id,
        processId: doc.process_id,
        documentId: doc.id,
        userId: doc.user_id,
        fileName: doc.file_name,
      })

      if (this.dryRun) {
        console.log(`  📝 Would upload to: ${s3Key}`)
        this.results.push({
          success: true,
          documentId: doc.id,
          oldPath: doc.storage_path,
          newKey: s3Key,
          size: buffer.length,
        })
        return
      }

      // 5. Upload to S3
      console.log(`  ⬆️  Uploading to S3: ${s3Key}`)
      const storageService = getStorageService()
      const uploadResult = await storageService.uploadFile({
        file: buffer,
        key: s3Key,
        contentType: doc.mime_type || "application/octet-stream",
        metadata: {
          "migrated-from": "supabase",
          "migration-date": new Date().toISOString(),
          "original-path": doc.storage_path,
        },
        userId: doc.user_id,
        workspaceId: process.workspace_id,
        processId: doc.process_id,
        skipQuotaCheck: true, // Skip quota check for migration
      })

      // 6. Update database
      const { error: updateError } = await supabase
        .from("process_documents")
        .update({
          storage_provider: "wasabi",
          storage_key: s3Key,
        })
        .eq("id", doc.id)

      if (updateError) {
        // Rollback: delete from S3
        await storageService
          .deleteFile({
            key: s3Key,
            userId: doc.user_id,
            sizeBytes: buffer.length,
          })
          .catch(console.error)

        throw new Error(`Database update failed: ${updateError.message}`)
      }

      const duration = Date.now() - startTime
      console.log(`  ✅ Migrated in ${duration}ms: ${doc.file_name}`)

      this.results.push({
        success: true,
        documentId: doc.id,
        oldPath: doc.storage_path,
        newKey: s3Key,
        size: buffer.length,
      })
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(
        `  ❌ Failed (${duration}ms): ${doc.file_name} - ${error.message}`
      )

      this.results.push({
        success: false,
        documentId: doc.id,
        oldPath: doc.storage_path,
        newKey: "",
        size: 0,
        error: error.message,
      })
    }
  }

  private printReport(): void {
    const successful = this.results.filter((r) => r.success)
    const failed = this.results.filter((r) => !r.success)
    const totalSize = successful.reduce((sum, r) => sum + r.size, 0)

    console.log("\n" + "=".repeat(70))
    console.log("📊 MIGRATION REPORT")
    console.log("=".repeat(70))
    console.log(`✅ Successful:      ${successful.length} documents`)
    console.log(`❌ Failed:          ${failed.length} documents`)
    console.log(`📦 Total Size:      ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(
      `📈 Success Rate:    ${(
        (successful.length / this.results.length) *
        100
      ).toFixed(2)}%`
    )

    if (failed.length > 0) {
      console.log("\n❌ Failed Documents:")
      failed.forEach((r) => {
        console.log(`  - ${r.documentId}: ${r.error}`)
      })

      // Save failed IDs for retry
      const failedIds = failed.map((r) => r.documentId)
      console.log(`\n📝 Failed IDs for retry:`)
      console.log(JSON.stringify(failedIds, null, 2))
    }

    console.log("=".repeat(70) + "\n")
  }
}

// Parse command line arguments
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        options.dryRun = true
        break
      case "--batch-size":
        options.batchSize = parseInt(args[++i])
        break
      case "--start-from":
        options.startFrom = args[++i]
        break
      case "--process-id":
        options.onlyProcessId = args[++i]
        break
      case "--workspace-id":
        options.onlyWorkspaceId = args[++i]
        break
    }
  }

  return options
}

// Run migration
async function main() {
  const options = parseArgs()

  console.log("Migration options:", options)

  const migration = new StorageMigration(options)

  try {
    await migration.migrateAll()
    process.exit(0)
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

main()
