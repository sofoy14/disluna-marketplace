// app/api/billing/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionByWorkspaceId, createSubscription, cancelSubscription } from '@/db/subscriptions';
import { getPlanById } from '@/db/plans';
import { getSupabaseServer } from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing workspace_id parameter' 
        },
        { status: 400 }
      );
    }

    const subscription = await getSubscriptionByWorkspaceId(workspaceId);
    
    return NextResponse.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  try {
    const { plan_id, workspace_id, payment_source_id, transaction_id } = await req.json();

    if (!plan_id || !workspace_id || !transaction_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: plan_id, workspace_id, and transaction_id' 
        },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = await getPlanById(plan_id);
    
    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('user_id')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Workspace not found' 
        },
        { status: 404 }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await getSubscriptionByWorkspaceId(workspace_id);
    if (existingSubscription) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Subscription already exists for this workspace' 
        },
        { status: 409 }
      );
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create subscription
    const subscription = await createSubscription({
      workspace_id,
      user_id: workspace.user_id,
      plan_id,
      payment_source_id: payment_source_id || null,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false
    });

    return NextResponse.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error creating subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { subscription_id, action } = await req.json();

    if (!subscription_id || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: subscription_id and action' 
        },
        { status: 400 }
      );
    }

    let updatedSubscription;

    switch (action) {
      case 'cancel':
        updatedSubscription = await cancelSubscription(subscription_id);
        break;
      case 'reactivate':
        updatedSubscription = await cancelSubscription(subscription_id); // This will unset cancel_at_period_end
        break;
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Supported actions: cancel, reactivate' 
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: updatedSubscription
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error updating subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





