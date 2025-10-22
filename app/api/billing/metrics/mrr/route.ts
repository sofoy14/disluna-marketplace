// app/api/billing/metrics/mrr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' }, 
        { status: 401 }
      );
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return NextResponse.json(
        { error: 'Invalid authorization format' }, 
        { status: 401 }
      );
    }

    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenParts[1]);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    // Build query for active subscriptions
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        plans(amount_in_cents, name)
      `)
      .eq('status', 'active');

    // Filter by workspace if specified
    if (workspaceId) {
      // Verify workspace belongs to user
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('user_id', user.id)
        .single();
      
      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' }, 
          { status: 404 }
        );
      }
      
      query = query.eq('workspace_id', workspaceId);
    } else {
      // Filter by user's workspaces
      query = query.in('workspace_id', 
        supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
      );
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Calculate MRR
    const mrr = subscriptions?.reduce((total, sub) => {
      return total + (sub.plans?.amount_in_cents || 0);
    }, 0) || 0;

    // Calculate metrics by plan
    const planMetrics = subscriptions?.reduce((acc, sub) => {
      const planName = sub.plans?.name || 'Unknown';
      const amount = sub.plans?.amount_in_cents || 0;
      
      if (!acc[planName]) {
        acc[planName] = {
          count: 0,
          revenue: 0
        };
      }
      
      acc[planName].count += 1;
      acc[planName].revenue += amount;
      
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>) || {};

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: canceledSubscriptions } = await supabase
      .from('subscriptions')
      .select('id')
      .gte('canceled_at', thirtyDaysAgo.toISOString())
      .eq('status', 'canceled');

    const totalSubscriptions = subscriptions?.length || 0;
    const churnedSubscriptions = canceledSubscriptions?.length || 0;
    const churnRate = totalSubscriptions > 0 ? (churnedSubscriptions / totalSubscriptions) * 100 : 0;

    return NextResponse.json({
      mrr_cents: mrr,
      mrr_formatted: new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(mrr),
      total_subscriptions: totalSubscriptions,
      active_subscriptions: subscriptions?.length || 0,
      churned_subscriptions: churnedSubscriptions,
      churn_rate: Math.round(churnRate * 100) / 100,
      plan_metrics: planMetrics,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating MRR:', error);
    return NextResponse.json(
      { error: 'Failed to calculate MRR' }, 
      { status: 500 }
    );
  }
}


