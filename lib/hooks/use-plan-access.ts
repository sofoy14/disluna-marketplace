// lib/hooks/use-plan-access.ts
// React hook for checking user plan access and features

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type PlanType = 'basic' | 'pro' | 'enterprise';

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

export interface UsageDisplay {
  tokens: {
    used: string;
    limit: string;
    remaining: string;
    percentage: number;
  };
  processes: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
  transcription: {
    used: string;
    limit: string;
    remaining: string;
    percentage: number;
  };
}

export interface PlanAccessState {
  isLoading: boolean;
  hasActiveSubscription: boolean;
  plan: {
    id: string | null;
    type: PlanType;
    name: string;
  };
  features: PlanFeatures;
  access: {
    chat: boolean;
    processes: boolean;
    transcriptions: boolean;
    multipleWorkspaces: boolean;
  };
  usage: UsageDisplay | null;
  limits: {
    canAccessChat: boolean;
    canAccessProcesses: boolean;
    canAccessTranscriptions: boolean;
    canCreateWorkspace: boolean;
    isWithinTokenLimits: boolean;
  };
  subscription: {
    id: string | null;
    periodEnd: string | null;
  };
}

const defaultState: PlanAccessState = {
  isLoading: true,
  hasActiveSubscription: false,
  plan: {
    id: null,
    type: 'basic',
    name: 'Sin suscripción'
  },
  features: {
    planType: 'basic',
    planName: 'Sin suscripción',
    hasChat: false,
    hasProcesses: false,
    hasTranscriptions: false,
    hasMultipleWorkspaces: false,
    maxOutputTokensMonthly: 0,
    maxProcesses: 0,
    maxTranscriptionHours: 0
  },
  access: {
    chat: false,
    processes: false,
    transcriptions: false,
    multipleWorkspaces: false
  },
  usage: null,
  limits: {
    canAccessChat: false,
    canAccessProcesses: false,
    canAccessTranscriptions: false,
    canCreateWorkspace: false,
    isWithinTokenLimits: false
  },
  subscription: {
    id: null,
    periodEnd: null
  }
};

export function usePlanAccess() {
  const [state, setState] = useState<PlanAccessState>(defaultState);

  const fetchPlanStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setState({ ...defaultState, isLoading: false });
        return;
      }

      const response = await fetch('/api/billing/plan-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setState({
          isLoading: false,
          hasActiveSubscription: result.data.hasActiveSubscription,
          plan: result.data.plan || defaultState.plan,
          features: result.data.features || defaultState.features,
          access: result.data.access || defaultState.access,
          usage: result.data.usageDisplay,
          limits: result.data.limits || defaultState.limits,
          subscription: result.data.subscription || defaultState.subscription
        });
      } else {
        setState({ ...defaultState, isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching plan status:', error);
      setState({ ...defaultState, isLoading: false });
    }
  }, []);

  useEffect(() => {
    fetchPlanStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPlanStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPlanStatus]);

  const refetch = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    fetchPlanStatus();
  }, [fetchPlanStatus]);

  return {
    ...state,
    refetch,
    // Convenience methods
    isPro: state.plan.type === 'pro' || state.plan.type === 'enterprise',
    isBasic: state.plan.type === 'basic',
    needsUpgrade: (feature: 'processes' | 'transcriptions' | 'workspaces') => {
      switch (feature) {
        case 'processes':
          return !state.features.hasProcesses;
        case 'transcriptions':
          return !state.features.hasTranscriptions;
        case 'workspaces':
          return !state.features.hasMultipleWorkspaces;
        default:
          return false;
      }
    }
  };
}

// Export type for context provider
export type PlanAccessContextType = ReturnType<typeof usePlanAccess>;





