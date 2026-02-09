/**
 * Quota Service
 * 
 * Manages storage quotas and usage tracking for users
 */

import { getSupabase } from "@/lib/supabase/client"
import {
  StorageQuota,
  QuotaCheckResult,
  StorageQuotaDB,
} from "./types"

export class QuotaService {
  private supabase = getSupabase()

  /**
   * Check if user has available storage quota for upload
   */
  async checkQuota(
    userId: string,
    requestedBytes: number
  ): Promise<QuotaCheckResult> {
    const { data, error } = await this.supabase.rpc("check_storage_quota", {
      p_user_id: userId,
      p_requested_bytes: requestedBytes,
    })

    if (error) {
      console.error("Error checking quota:", error)
      throw new Error("Failed to check storage quota")
    }

    const result = data?.[0]

    return {
      allowed: result?.allowed ?? false,
      currentUsage: Number(result?.current_usage ?? 0),
      limit: Number(result?.limit_bytes ?? 0),
      remaining: Number(result?.remaining_bytes ?? 0),
      message: result?.message || "Error checking quota",
    }
  }

  /**
   * Increment storage usage after successful upload
   */
  async incrementUsage(userId: string, bytes: number): Promise<void> {
    const { error } = await this.supabase.rpc("increment_storage_usage", {
      p_user_id: userId,
      p_bytes: bytes,
    })

    if (error) {
      console.error("Error incrementing storage usage:", error)
      throw new Error("Failed to update storage usage")
    }
  }

  /**
   * Decrement storage usage after file deletion
   */
  async decrementUsage(userId: string, bytes: number): Promise<void> {
    const { error } = await this.supabase.rpc("decrement_storage_usage", {
      p_user_id: userId,
      p_bytes: bytes,
    })

    if (error) {
      console.error("Error decrementing storage usage:", error)
      // Don't throw to prevent blocking deletion
    }
  }

  /**
   * Get complete quota status for a user
   */
  async getQuotaStatus(userId: string): Promise<StorageQuota | null> {
    const { data, error } = await this.supabase
      .from("storage_quotas")
      .select("*")
      .eq("user_id", userId)
      .lte("period_start", new Date().toISOString())
      .gt("period_end", new Date().toISOString())
      .order("period_start", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToStorageQuota(data)
  }

  /**
   * Initialize quota for a new subscription period
   */
  async initializeQuota(
    userId: string,
    limitBytes: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    const { error } = await this.supabase.from("storage_quotas").upsert(
      {
        user_id: userId,
        storage_limit_bytes: limitBytes,
        storage_used_bytes: 0,
        documents_count: 0,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      },
      {
        onConflict: "user_id,period_start",
      }
    )

    if (error) {
      console.error("Error initializing quota:", error)
      throw new Error("Failed to initialize storage quota")
    }
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === -1) return "Ilimitado"
    if (bytes === 0) return "0 B"

    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  /**
   * Calculate usage percentage
   */
  calculateUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0
    if (limit === 0) return 100
    return Math.min(100, (used / limit) * 100)
  }

  private mapToStorageQuota(data: StorageQuotaDB): StorageQuota {
    const isUnlimited = data.storage_limit_bytes === -1

    return {
      userId: data.user_id,
      usedBytes: data.storage_used_bytes,
      limitBytes: data.storage_limit_bytes,
      remainingBytes: isUnlimited
        ? -1
        : Math.max(0, data.storage_limit_bytes - data.storage_used_bytes),
      isUnlimited,
      documentsCount: data.documents_count,
      periodStart: new Date(data.period_start),
      periodEnd: new Date(data.period_end),
    }
  }
}

// Export singleton instance
export const quotaService = new QuotaService()
