// db/usage-tracking.ts
// Tracking de consumo de recursos por usuario

import { getSupabaseServer } from "@/lib/supabase/server-client"

export interface UsageTracking {
  id: string;
  user_id: string;
  subscription_id: string | null;
  period_start: string;
  period_end: string;
  output_tokens_used: number;
  input_tokens_used: number;
  processes_created: number;
  transcription_seconds_used: number;
  chat_sessions_count: number;
  messages_count: number;
  created_at: string;
  updated_at: string;
}

export interface UsageLimits {
  is_within_limits: boolean;
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  processes_used: number;
  processes_limit: number;
  transcription_seconds_used: number;
  transcription_limit_seconds: number;
  plan_type: string;
}

/**
 * Get current usage for a user
 */
export const getCurrentUsage = async (userId: string): Promise<UsageTracking | null> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .rpc('get_or_create_current_usage', { p_user_id: userId })

  if (error) {
    console.error('Error getting current usage:', error);
    return null;
  }

  return data;
};

/**
 * Increment token usage for a user
 */
export const incrementTokenUsage = async (
  userId: string,
  outputTokens: number = 0,
  inputTokens: number = 0
): Promise<UsageTracking | null> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .rpc('increment_token_usage', {
      p_user_id: userId,
      p_output_tokens: outputTokens,
      p_input_tokens: inputTokens
    });

  if (error) {
    console.error('Error incrementing token usage:', error);
    return null;
  }

  return data;
};

/**
 * Check if user is within their plan limits
 */
export const checkUsageLimits = async (userId: string): Promise<UsageLimits | null> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .rpc('check_usage_limits', { p_user_id: userId });

  if (error) {
    console.error('Error checking usage limits:', error);
    return null;
  }

  // The function returns an array with one row
  return data?.[0] || null;
};

/**
 * Increment process count for a user
 */
export const incrementProcessCount = async (userId: string): Promise<boolean> => {
  const supabase = getSupabaseServer();
  const usage = await getCurrentUsage(userId);
  if (!usage) return false;

  const { error } = await supabase
    .from('usage_tracking')
    .update({ 
      processes_created: usage.processes_created + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', usage.id);

  return !error;
};

/**
 * Increment transcription seconds for a user
 */
export const incrementTranscriptionUsage = async (
  userId: string,
  durationSeconds: number
): Promise<boolean> => {
  const supabase = getSupabaseServer();
  const usage = await getCurrentUsage(userId);
  if (!usage) return false;

  const { error } = await supabase
    .from('usage_tracking')
    .update({ 
      transcription_seconds_used: usage.transcription_seconds_used + durationSeconds,
      updated_at: new Date().toISOString()
    })
    .eq('id', usage.id);

  return !error;
};

/**
 * Get usage history for a user
 */
export const getUsageHistory = async (
  userId: string,
  limit: number = 12
): Promise<UsageTracking[]> => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('period_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting usage history:', error);
    return [];
  }

  return data || [];
};

/**
 * Format usage for display
 */
export const formatUsageDisplay = (usage: UsageLimits) => {
  const formatTokens = (tokens: number) => {
    if (tokens === -1) return 'Ilimitado';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return {
    tokens: {
      used: formatTokens(usage.tokens_used),
      limit: formatTokens(usage.tokens_limit),
      remaining: formatTokens(usage.tokens_remaining),
      percentage: usage.tokens_limit === -1 ? 0 : Math.min(100, (usage.tokens_used / usage.tokens_limit) * 100)
    },
    processes: {
      used: usage.processes_used,
      limit: usage.processes_limit,
      remaining: Math.max(0, usage.processes_limit - usage.processes_used),
      percentage: usage.processes_limit === 0 ? 0 : Math.min(100, (usage.processes_used / usage.processes_limit) * 100)
    },
    transcription: {
      used: formatSeconds(usage.transcription_seconds_used),
      limit: formatSeconds(usage.transcription_limit_seconds),
      remaining: formatSeconds(Math.max(0, usage.transcription_limit_seconds - usage.transcription_seconds_used)),
      percentage: usage.transcription_limit_seconds === 0 ? 0 : Math.min(100, (usage.transcription_seconds_used / usage.transcription_limit_seconds) * 100)
    }
  };
};
























