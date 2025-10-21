// app/api/billing/subscriptions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSubscription, getSubscriptionById } from '@/db/billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get subscription and verify ownership
    const subscription = await getSubscriptionById(params.id);
    
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

    // Cancel subscription (set to cancel at period end)
    await updateSubscription(params.id, {
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' }, 
      { status: 500 }
    );
  }
}

