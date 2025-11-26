// app/api/billing/plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar cliente de servidor para API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Precio especial primer mes: $4,000 COP = 400000 centavos
const FIRST_MONTH_PRICE_CENTS = 400000;

export type BillingPeriod = 'monthly' | 'yearly';

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
}

interface PlanWithPromo extends Plan {
  first_month_price?: number;
  has_first_month_promo?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') as BillingPeriod | null;
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

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching plans:', error);
      throw new Error(`Error fetching plans: ${error.message}`);
    }

    if (!plans || plans.length === 0) {
      return NextResponse.json({
        success: true,
        data: grouped ? { monthly: [], yearly: [] } : []
      });
    }

    // Añadir info de promoción primer mes a planes mensuales
    const plansWithPromo: PlanWithPromo[] = plans.map(plan => {
      if (plan.billing_period === 'monthly') {
        return {
          ...plan,
          first_month_price: FIRST_MONTH_PRICE_CENTS,
          has_first_month_promo: true
        };
      }
      return plan;
    });

    if (grouped) {
      return NextResponse.json({
        success: true,
        data: {
          monthly: plansWithPromo.filter(p => p.billing_period === 'monthly'),
          yearly: plansWithPromo.filter(p => p.billing_period === 'yearly')
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: plansWithPromo
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching plans',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
