/**
 * useStorageQuota Hook
 * 
 * React hook for managing storage quota state
 */

import { useState, useEffect, useCallback } from "react"

export interface QuotaStatus {
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

interface UseStorageQuotaReturn {
  quota: QuotaStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  hasAvailableSpace: (requiredBytes: number) => boolean
  canUpload: boolean
  isNearLimit: boolean
  isAtLimit: boolean
}

export function useStorageQuota(): UseStorageQuotaReturn {
  const [quota, setQuota] = useState<QuotaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuota = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/storage/quota")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch quota")
      }

      const data = await response.json()
      setQuota(data)
    } catch (err: any) {
      setError(err.message)
      console.error("Error fetching quota:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQuota()
  }, [fetchQuota])

  const hasAvailableSpace = useCallback(
    (requiredBytes: number): boolean => {
      if (!quota) return false
      if (quota.isUnlimited) return true
      if (quota.limitBytes === 0) return false
      return quota.remainingBytes >= requiredBytes
    },
    [quota]
  )

  const canUpload = useCallback((): boolean => {
    if (!quota) return false
    if (!quota.plan.hasStorage) return false
    if (quota.isUnlimited) return true
    return quota.remainingBytes > 0
  }, [quota])

  const isNearLimit = useCallback((): boolean => {
    if (!quota || quota.isUnlimited) return false
    return quota.usagePercentage > 80
  }, [quota])

  const isAtLimit = useCallback((): boolean => {
    if (!quota || quota.isUnlimited) return false
    return quota.usagePercentage >= 100
  }, [quota])

  return {
    quota,
    loading,
    error,
    refresh: fetchQuota,
    hasAvailableSpace,
    canUpload: canUpload(),
    isNearLimit: isNearLimit(),
    isAtLimit: isAtLimit(),
  }
}
