// app/api/billing/plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-client';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type BillingPeriod = 'monthly' | 'yearly';
export type PlanType = 'basic' | 'pro' | 'enterprise';

interface Plan {
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
  plan_type?: PlanType;
  max_output_tokens_monthly?: number;
  max_processes?: number;
  max_transcription_hours?: number;
  has_multiple_workspaces?: boolean;
  has_processes?: boolean;
  has_transcriptions?: boolean;
}

// Default plans if none exist in database
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Plan Básico',
    description: 'Ideal para abogados que buscan asistencia IA en sus consultas diarias',
    amount_in_cents: 2900000, // $29,000 COP
    currency: 'COP',
    billing_period: 'monthly',
    features: [
      'Chat con asistente legal IA',
      'Hasta 2 millones de tokens/mes',
      'Análisis de normativa colombiana',
      'Búsqueda inteligente de jurisprudencia',
      'Soporte por email',
      '1 espacio de trabajo'
    ],
    query_limit: 100,
    sort_order: 1,
    is_active: true,
    plan_type: 'basic',
    max_output_tokens_monthly: 2000000,
    max_processes: 0,
    max_transcription_hours: 0,
    has_multiple_workspaces: false,
    has_processes: false,
    has_transcriptions: false
  },
  {
    id: 'pro',
    name: 'Plan PRO',
    description: 'La solución completa para profesionales del derecho',
    amount_in_cents: 6800000, // $68,000 COP
    currency: 'COP',
    billing_period: 'monthly',
    features: [
      'Chat con asistente legal IA ilimitado',
      'Tokens de chat ilimitados',
      'Análisis de normativa colombiana',
      'Búsqueda inteligente de jurisprudencia',
      'Soporte prioritario 24/7',
      'Múltiples espacios de trabajo',
      '7 procesos legales incluidos',
      '5 horas de transcripción de audio'
    ],
    query_limit: -1, // unlimited
    sort_order: 2,
    is_active: true,
    plan_type: 'pro',
    max_output_tokens_monthly: -1, // unlimited
    max_processes: 7,
    max_transcription_hours: 5,
    has_multiple_workspaces: true,
    has_processes: true,
    has_transcriptions: true
  }
];

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const url = new URL(req.url);
    const period = url.searchParams.get('period') as BillingPeriod | null;
    const planType = url.searchParams.get('plan_type') as PlanType | null;
    const grouped = url.searchParams.get('grouped') === 'true';

    // Construir query
    let query = supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (period) {
      query = query.eq('billing_period', period);
    }
    
    if (planType) {
      query = query.eq('plan_type', planType);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching plans:', error);
      // If error or no plans, return default plans
      return NextResponse.json({
        success: true,
        data: grouped ? { 
          monthly: DEFAULT_PLANS.filter(p => p.billing_period === 'monthly'),
          yearly: DEFAULT_PLANS.filter(p => p.billing_period === 'yearly')
        } : DEFAULT_PLANS
      });
    }

    // If no plans in database, return defaults
    if (!plans || plans.length === 0) {
      return NextResponse.json({
        success: true,
        data: grouped ? { 
          monthly: DEFAULT_PLANS.filter(p => p.billing_period === 'monthly'),
          yearly: DEFAULT_PLANS.filter(p => p.billing_period === 'yearly')
        } : DEFAULT_PLANS
      });
    }

    // Ensure plan_type is set (for backwards compatibility)
    const normalizedPlans: Plan[] = plans.map((plan: any) => ({
      ...plan,
      plan_type: plan.plan_type || inferPlanType(plan),
      max_output_tokens_monthly: plan.max_output_tokens_monthly ?? (plan.query_limit === -1 ? -1 : 2000000),
      max_processes: plan.max_processes ?? 0,
      max_transcription_hours: plan.max_transcription_hours ?? 0,
      has_multiple_workspaces: plan.has_multiple_workspaces ?? false,
      has_processes: plan.has_processes ?? false,
      has_transcriptions: plan.has_transcriptions ?? false
    }));

    if (grouped) {
      return NextResponse.json({
        success: true,
        data: {
          monthly: normalizedPlans.filter(p => p.billing_period === 'monthly'),
          yearly: normalizedPlans.filter(p => p.billing_period === 'yearly'),
          basic: normalizedPlans.filter(p => p.plan_type === 'basic'),
          pro: normalizedPlans.filter(p => p.plan_type === 'pro')
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: normalizedPlans
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    // Return default plans on error
    return NextResponse.json({
      success: true,
      data: DEFAULT_PLANS
    });
  }
}

// Infer plan type from existing plan data (for backwards compatibility)
function inferPlanType(plan: any): PlanType {
  // If name contains "PRO" or "Pro", it's a pro plan
  if (plan.name?.toLowerCase().includes('pro')) {
    return 'pro';
  }
  // If name contains "Enterprise" or has unlimited features
  if (plan.name?.toLowerCase().includes('enterprise') || plan.query_limit === -1) {
    return 'enterprise';
  }
  // Default to basic
  return 'basic';
}
