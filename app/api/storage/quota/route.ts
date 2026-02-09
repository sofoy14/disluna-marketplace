/**
 * Storage Quota API Route
 * 
 * Returns current storage quota status for the authenticated user
 */

export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getStorageService } from "@/lib/storage"

export interface QuotaResponse {
  usedBytes: number
  limitBytes: number
  remainingBytes: number
  isUnlimited: boolean
  documentsCount: number
  usagePercentage: number
  formatted: {
    used: string
    limit: string
    remaining: string
  }
  plan: {
    hasStorage: boolean
    limitDescription: string
  }
}

export async function GET() {
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

    // 2. Get quota status
    const storageService = getStorageService()
    const quota = await storageService.getQuotaStatus(user.id)

    // 3. Return default if no quota record
    if (!quota) {
      const response: QuotaResponse = {
        usedBytes: 0,
        limitBytes: 0,
        remainingBytes: 0,
        isUnlimited: false,
        documentsCount: 0,
        usagePercentage: 0,
        formatted: {
          used: "0 B",
          limit: "0 B",
          remaining: "0 B",
        },
        plan: {
          hasStorage: false,
          limitDescription: "Sin almacenamiento de archivos",
        },
      }
      return NextResponse.json(response)
    }

    // 4. Calculate usage percentage
    const usagePercentage = quota.isUnlimited
      ? 0
      : quota.limitBytes > 0
        ? (quota.usedBytes / quota.limitBytes) * 100
        : 0

    // 5. Build response
    const response: QuotaResponse = {
      usedBytes: quota.usedBytes,
      limitBytes: quota.limitBytes,
      remainingBytes: quota.remainingBytes,
      isUnlimited: quota.isUnlimited,
      documentsCount: quota.documentsCount,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      formatted: {
        used: storageService.formatBytes(quota.usedBytes),
        limit: storageService.formatBytes(quota.limitBytes),
        remaining: storageService.formatBytes(quota.remainingBytes),
      },
      plan: {
        hasStorage: quota.limitBytes !== 0,
        limitDescription: quota.isUnlimited
          ? "Almacenamiento ilimitado"
          : quota.limitBytes === 0
            ? "Sin almacenamiento de archivos"
            : `Límite de ${storageService.formatBytes(quota.limitBytes)}`,
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error fetching quota:", error)
    return NextResponse.json(
      { error: "Failed to fetch quota", details: error.message },
      { status: 500 }
    )
  }
}
