// lib/billing/plan-access.ts
// Utilities for checking plan-based feature access

import { createClient } from '@supabase/supabase-js';
import { Plan, PlanType } from '@/db/plans';
import { checkUsageLimits, UsageLimits } from '@/db/usage-tracking';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface PlanFeatures {
  planType: PlanType;
  planName: string;
  hasChat: boolean;
  hasProcesses: boolean;
  hasTranscriptions: boolean;
  hasMultipleWorkspaces: boolean;
  maxOutputTokensMonthly: number;
  maxProcesses: number;
  maxTranscriptionHours: number;
}

export interface UserPlanStatus {
  hasActiveSubscription: boolean;
  features: PlanFeatures;
  usage: UsageLimits | null;
  canAccessChat: boolean;
  canAccessProcesses: boolean;
  canAccessTranscriptions: boolean;
  canCreateWorkspace: boolean;
  isWithinTokenLimits: boolean;
  planId: string | null;
  subscriptionId: string | null;
  periodEnd: Date | null;
}

// Default features for users without subscription (no access)
const NO_ACCESS_FEATURES: PlanFeatures = {
  planType: 'basic' as PlanType,
  planName: 'Sin suscripción',
  hasChat: false,
  hasProcesses: false,
  hasTranscriptions: false,
  hasMultipleWorkspaces: false,
  maxOutputTokensMonthly: 0,
  maxProcesses: 0,
  maxTranscriptionHours: 0
};

// Basic plan features
const BASIC_FEATURES: PlanFeatures = {
  planType: 'basic' as PlanType,
  planName: 'Plan Básico',
  hasChat: true,
  hasProcesses: false,
  hasTranscriptions: false,
  hasMultipleWorkspaces: false,
  maxOutputTokensMonthly: 2000000, // 2 million tokens
  maxProcesses: 0,
  maxTranscriptionHours: 0
};

// PRO plan features
const PRO_FEATURES: PlanFeatures = {
  planType: 'pro' as PlanType,
  planName: 'Plan PRO',
  hasChat: true,
  hasProcesses: true,
  hasTranscriptions: true,
  hasMultipleWorkspaces: true,
  maxOutputTokensMonthly: -1, // Unlimited
  maxProcesses: 7,
  maxTranscriptionHours: 5
};

/**
 * Get plan features from database or use defaults
 */
export const getPlanFeatures = async (planId: string): Promise<PlanFeatures> => {
  try {
    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !plan) {
      console.error('Error fetching plan:', error);
      return NO_ACCESS_FEATURES;
    }

    return {
      planType: (plan.plan_type as PlanType) || 'basic',
      planName: plan.name,
      hasChat: true, // All plans have chat
      hasProcesses: plan.has_processes || false,
      hasTranscriptions: plan.has_transcriptions || false,
      hasMultipleWorkspaces: plan.has_multiple_workspaces || false,
      maxOutputTokensMonthly: plan.max_output_tokens_monthly || 0,
      maxProcesses: plan.max_processes || 0,
      maxTranscriptionHours: plan.max_transcription_hours || 0
    };
  } catch (error) {
    console.error('Error in getPlanFeatures:', error);
    return NO_ACCESS_FEATURES;
  }
};

/**
 * Get complete user plan status including subscription, features, and usage
 */
export const getUserPlanStatus = async (userId: string): Promise<UserPlanStatus> => {
  try {
    // Get active subscription with plan
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plans:plan_id (*)
      `)
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
    }

    // No active subscription
    if (!subscription || !subscription.plans) {
      return {
        hasActiveSubscription: false,
        features: NO_ACCESS_FEATURES,
        usage: null,
        canAccessChat: false,
        canAccessProcesses: false,
        canAccessTranscriptions: false,
        canCreateWorkspace: false,
        isWithinTokenLimits: false,
        planId: null,
        subscriptionId: null,
        periodEnd: null
      };
    }

    const plan = subscription.plans as any;
    const features: PlanFeatures = {
      planType: (plan.plan_type as PlanType) || 'basic',
      planName: plan.name,
      hasChat: true,
      hasProcesses: plan.has_processes || false,
      hasTranscriptions: plan.has_transcriptions || false,
      hasMultipleWorkspaces: plan.has_multiple_workspaces || false,
      maxOutputTokensMonthly: plan.max_output_tokens_monthly || 0,
      maxProcesses: plan.max_processes || 0,
      maxTranscriptionHours: plan.max_transcription_hours || 0
    };

    // Get usage limits
    const usage = await checkUsageLimits(userId);

    // Calculate access permissions
    const isWithinTokenLimits = usage?.is_within_limits ?? true;
    const periodEnd = new Date(subscription.current_period_end);
    const isPeriodValid = periodEnd > new Date();

    return {
      hasActiveSubscription: true,
      features,
      usage,
      canAccessChat: isPeriodValid && isWithinTokenLimits,
      canAccessProcesses: features.hasProcesses && isPeriodValid,
      canAccessTranscriptions: features.hasTranscriptions && isPeriodValid,
      canCreateWorkspace: features.hasMultipleWorkspaces && isPeriodValid,
      isWithinTokenLimits,
      planId: plan.id,
      subscriptionId: subscription.id,
      periodEnd
    };
  } catch (error) {
    console.error('Error in getUserPlanStatus:', error);
    return {
      hasActiveSubscription: false,
      features: NO_ACCESS_FEATURES,
      usage: null,
      canAccessChat: false,
      canAccessProcesses: false,
      canAccessTranscriptions: false,
      canCreateWorkspace: false,
      isWithinTokenLimits: false,
      planId: null,
      subscriptionId: null,
      periodEnd: null
    };
  }
};

/**
 * Check if user can create a new process
 */
export const canCreateProcess = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const status = await getUserPlanStatus(userId);
  
  if (!status.hasActiveSubscription) {
    return { allowed: false, reason: 'No tienes una suscripción activa' };
  }
  
  if (!status.features.hasProcesses) {
    return { allowed: false, reason: 'Tu plan no incluye procesos legales. Actualiza al Plan PRO.' };
  }
  
  if (status.usage && status.usage.processes_used >= status.features.maxProcesses) {
    return { allowed: false, reason: `Has alcanzado el límite de ${status.features.maxProcesses} procesos de tu plan` };
  }
  
  return { allowed: true };
};

/**
 * Check if user can use transcription
 */
export const canUseTranscription = async (
  userId: string, 
  requestedSeconds: number = 0
): Promise<{ allowed: boolean; reason?: string; remainingSeconds?: number }> => {
  const status = await getUserPlanStatus(userId);
  
  if (!status.hasActiveSubscription) {
    return { allowed: false, reason: 'No tienes una suscripción activa' };
  }
  
  if (!status.features.hasTranscriptions) {
    return { allowed: false, reason: 'Tu plan no incluye transcripciones. Actualiza al Plan PRO.' };
  }
  
  const maxSeconds = status.features.maxTranscriptionHours * 3600;
  const usedSeconds = status.usage?.transcription_seconds_used || 0;
  const remainingSeconds = maxSeconds - usedSeconds;
  
  if (requestedSeconds > remainingSeconds) {
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    return { 
      allowed: false, 
      reason: `Te quedan ${remainingMinutes} minutos de transcripción este mes`,
      remainingSeconds
    };
  }
  
  return { allowed: true, remainingSeconds };
};

/**
 * Check if user can continue chatting (within token limits)
 */
export const canContinueChat = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const status = await getUserPlanStatus(userId);
  
  if (!status.hasActiveSubscription) {
    return { allowed: false, reason: 'No tienes una suscripción activa' };
  }
  
  if (!status.isWithinTokenLimits) {
    return { 
      allowed: false, 
      reason: 'Has alcanzado el límite de tokens de tu plan. Actualiza al Plan PRO para tokens ilimitados.'
    };
  }
  
  return { allowed: true };
};

/**
 * Check if user can create additional workspaces
 */
export const canCreateWorkspace = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const status = await getUserPlanStatus(userId);
  
  if (!status.hasActiveSubscription) {
    return { allowed: false, reason: 'No tienes una suscripción activa' };
  }
  
  if (!status.features.hasMultipleWorkspaces) {
    // Check if user already has a workspace
    const { count } = await supabase
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if ((count || 0) >= 1) {
      return { 
        allowed: false, 
        reason: 'Tu plan solo permite un espacio de trabajo. Actualiza al Plan PRO para múltiples espacios.'
      };
    }
  }
  
  return { allowed: true };
};

/**
 * Get feature access status for UI display
 */
export const getFeatureAccessMap = async (userId: string): Promise<{
  chat: boolean;
  processes: boolean;
  transcriptions: boolean;
  multipleWorkspaces: boolean;
  planType: PlanType;
  planName: string;
}> => {
  const status = await getUserPlanStatus(userId);
  
  return {
    chat: status.canAccessChat,
    processes: status.canAccessProcesses,
    transcriptions: status.canAccessTranscriptions,
    multipleWorkspaces: status.canCreateWorkspace,
    planType: status.features.planType,
    planName: status.features.planName
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL USAGE LIMITS (Plan Estudiantil)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelUsageStatus {
  model_id: string;
  model_name: string;
  usage_count: number;
  monthly_limit: number;
  remaining: number;
  is_unlimited: boolean;
  can_use: boolean;
}

/**
 * Check if user can use a specific model based on their plan limits
 */
export const canUseModel = async (
  userId: string, 
  modelId: string
): Promise<{ allowed: boolean; reason?: string; usage?: ModelUsageStatus }> => {
  try {
    const { data, error } = await supabase.rpc('get_model_usage_status', {
      p_user_id: userId,
      p_model_id: modelId
    });
    
    if (error) {
      console.error('Error checking model usage:', error);
      // En caso de error, permitir el uso para no bloquear
      return { allowed: true };
    }
    
    const status = data?.[0] as ModelUsageStatus | undefined;
    
    if (!status) {
      // No hay configuración para este modelo, permitir por defecto
      return { allowed: true };
    }
    
    if (!status.can_use) {
      return {
        allowed: false,
        reason: `Has alcanzado el límite de ${status.monthly_limit} consultas para ${status.model_name} este mes. Prueba con M1 Small (ilimitado) o actualiza tu plan.`,
        usage: status
      };
    }
    
    return { allowed: true, usage: status };
  } catch (error) {
    console.error('Error in canUseModel:', error);
    // En caso de error, permitir el uso para no bloquear
    return { allowed: true };
  }
};

/**
 * Increment model usage after a successful query
 */
export const incrementModelUsage = async (
  userId: string,
  modelId: string
): Promise<{ success: boolean; error?: string; usage?: ModelUsageStatus }> => {
  try {
    const { data, error } = await supabase.rpc('increment_model_usage', {
      p_user_id: userId,
      p_model_id: modelId
    });
    
    if (error) {
      console.error('Error incrementing model usage:', error);
      return { success: false, error: error.message };
    }
    
    const result = data?.[0];
    
    if (!result?.success) {
      return {
        success: false,
        error: result?.error_message || 'Límite de uso alcanzado',
        usage: {
          model_id: modelId,
          model_name: '',
          usage_count: result?.usage_count || 0,
          monthly_limit: result?.monthly_limit || 0,
          remaining: result?.remaining || 0,
          is_unlimited: false,
          can_use: false
        }
      };
    }
    
    return {
      success: true,
      usage: {
        model_id: modelId,
        model_name: '',
        usage_count: result?.usage_count || 0,
        monthly_limit: result?.monthly_limit || 0,
        remaining: result?.remaining || 0,
        is_unlimited: result?.monthly_limit === -1,
        can_use: true
      }
    };
  } catch (error) {
    console.error('Error in incrementModelUsage:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
};

/**
 * Get all model usage for a user
 */
export const getAllModelUsage = async (userId: string): Promise<ModelUsageStatus[]> => {
  try {
    const { data, error } = await supabase.rpc('get_all_model_usage', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error getting all model usage:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllModelUsage:', error);
    return [];
  }
};












