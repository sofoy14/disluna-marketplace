// app/api/billing/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSubscriptionById, getPlanById } from '@/db/billing';
import { calculateProration } from '@/lib/wompi/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { subscription_id, new_plan_id } = await req.json();

    // Validate required fields
    if (!subscription_id || !new_plan_id) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

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

    // Get subscription and verify ownership
    const subscription = await getSubscriptionById(subscription_id);
    
    // Verify workspace belongs to user
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', subscription.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!workspace) {
      return NextResponse.json(
        { error: 'Subscription not found' }, 
        { status: 404 }
      );
    }

    // Get new plan
    const newPlan = await getPlanById(new_plan_id);

    // Calculate proration
    const currentPeriodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const { credit, chargeNow } = calculateProration(
      subscription.plans.amount_in_cents,
      newPlan.amount_in_cents,
      daysRemaining
    );

    return NextResponse.json({
      current_plan: subscription.plans,
      new_plan: newPlan,
      days_remaining: daysRemaining,
      credit_cents: credit,
      charge_now_cents: chargeNow,
      is_upgrade: newPlan.amount_in_cents > subscription.plans.amount_in_cents,
      is_downgrade: newPlan.amount_in_cents < subscription.plans.amount_in_cents
    });

  } catch (error) {
    console.error('Error calculating proration:', error);
    return NextResponse.json(
      { error: 'Failed to calculate proration' }, 
      { status: 500 }
    );
  }
}


