import { useState, useEffect, useCallback, useContext } from 'react'
import { ALIContext } from '@/context/context'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelUsageStatus {
  model_id: string
  model_name: string
  usage_count: number
  monthly_limit: number
  remaining: number
  is_unlimited: boolean
  can_use: boolean
}

export interface ModelUsageState {
  isLoading: boolean
  error: string | null
  usage: ModelUsageStatus[]
  getUsageForModel: (modelId: string) => ModelUsageStatus | null
  canUseModel: (modelId: string) => boolean
  getRemainingForModel: (modelId: string) => number | null
  refetch: () => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useModelUsage(): ModelUsageState {
  const { profile } = useContext(ALIContext)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<ModelUsageStatus[]>([])
  
  const fetchUsage = useCallback(async () => {
    // Skip if billing is disabled or user has pro/enterprise plan
    const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true'
    const planType = profile?.plan_type || 'none'
    
    // Pro and enterprise plans have unlimited usage
    if (!billingEnabled || planType === 'pro' || planType === 'enterprise') {
      setUsage([])
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/billing/model-usage')
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error fetching model usage')
      }
      
      const data = await response.json()
      setUsage(data.usage || [])
    } catch (err: any) {
      console.error('Error fetching model usage:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.plan_type])
  
  // Fetch on mount and when profile changes
  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])
  
  // Helper functions
  const getUsageForModel = useCallback((modelId: string): ModelUsageStatus | null => {
    return usage.find(u => u.model_id === modelId) || null
  }, [usage])
  
  const canUseModel = useCallback((modelId: string): boolean => {
    const planType = profile?.plan_type || 'none'
    
    // Pro and enterprise have unlimited access
    if (planType === 'pro' || planType === 'enterprise') {
      return true
    }
    
    const modelUsage = getUsageForModel(modelId)
    
    // If no usage data, assume can use
    if (!modelUsage) return true
    
    return modelUsage.can_use
  }, [getUsageForModel, profile?.plan_type])
  
  const getRemainingForModel = useCallback((modelId: string): number | null => {
    const planType = profile?.plan_type || 'none'
    
    // Pro and enterprise have unlimited access
    if (planType === 'pro' || planType === 'enterprise') {
      return null // null means unlimited
    }
    
    const modelUsage = getUsageForModel(modelId)
    
    if (!modelUsage || modelUsage.is_unlimited) {
      return null // unlimited
    }
    
    return modelUsage.remaining
  }, [getUsageForModel, profile?.plan_type])
  
  return {
    isLoading,
    error,
    usage,
    getUsageForModel,
    canUseModel,
    getRemainingForModel,
    refetch: fetchUsage
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format remaining count for display
 */
export function formatRemainingCount(remaining: number | null, limit: number): string {
  if (remaining === null || limit === -1) {
    return 'Ilimitado'
  }
  
  if (remaining === 0) {
    return 'Agotado'
  }
  
  return `${remaining}/${limit} restantes`
}

/**
 * Get progress percentage for usage bar
 */
export function getUsagePercentage(usageCount: number, monthlyLimit: number): number {
  if (monthlyLimit === -1) {
    return 0 // Unlimited = no progress bar needed
  }
  
  return Math.min(100, (usageCount / monthlyLimit) * 100)
}

/**
 * Get color class for usage bar based on remaining percentage
 */
export function getUsageColorClass(usageCount: number, monthlyLimit: number): string {
  if (monthlyLimit === -1) {
    return 'bg-emerald-500' // Unlimited = green
  }
  
  const percentage = (usageCount / monthlyLimit) * 100
  
  if (percentage >= 90) {
    return 'bg-red-500'
  } else if (percentage >= 70) {
    return 'bg-amber-500'
  }
  
  return 'bg-emerald-500'
}

