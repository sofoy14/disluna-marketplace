// db/plans.ts
// Acceso a datos de planes de suscripción

import { supabase } from "@/lib/supabase/robust-client"

export type BillingPeriod = 'monthly' | 'yearly';
export type PlanType = 'basic' | 'pro' | 'enterprise';

export interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  billing_period: BillingPeriod;
  features: string[];
  query_limit: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New plan feature fields
  plan_type: PlanType;
  max_output_tokens_monthly: number; // -1 = unlimited
  max_processes: number;
  max_transcription_hours: number;
  has_multiple_workspaces: boolean;
  has_processes: boolean;
  has_transcriptions: boolean;
}

export const getPlans = async (billingPeriod?: BillingPeriod): Promise<Plan[]> => {
  let query = supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (billingPeriod) {
    query = query.eq("billing_period", billingPeriod);
  }

  const { data: plans, error } = await query;

  if (error) {
    console.error('Error fetching plans:', error);
    throw new Error(`Error fetching plans: ${error.message}`);
  }

  return plans || [];
};

export const getPlanById = async (planId: string): Promise<Plan> => {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .single();

  if (error || !plan) {
    throw new Error(`Plan not found: ${error?.message || 'Unknown error'}`);
  }

  return plan;
};

export const getPlansGroupedByPeriod = async (): Promise<{
  monthly: Plan[];
  yearly: Plan[];
}> => {
  const allPlans = await getPlans();
  
  return {
    monthly: allPlans.filter(p => p.billing_period === 'monthly'),
    yearly: allPlans.filter(p => p.billing_period === 'yearly')
  };
};

// Calcula la fecha de fin del período basado en el plan
export const calculatePeriodEnd = (plan: Plan, startDate: Date = new Date()): Date => {
  const endDate = new Date(startDate);
  
  if (plan.billing_period === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  
  return endDate;
};

// Calcula el precio mensual equivalente para mostrar comparaciones
export const getMonthlyEquivalent = (plan: Plan): number => {
  if (plan.billing_period === 'yearly') {
    return Math.round(plan.amount_in_cents / 12);
  }
  return plan.amount_in_cents;
};
