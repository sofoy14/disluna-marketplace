// app/api/billing/subscriptions/[id]/change-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getSubscriptionById, 
  updateSubscription,
  createInvoice,
  createTransaction 
} from '@/db/billing';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { generateTransactionReference } from '@/lib/wompi/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    const { new_plan_id } = await req.json();

    // Validate required fields
    if (!new_plan_id) {
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

    // Get new plan
    const { data: newPlan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', new_plan_id)
      .single();

    if (!newPlan) {
      return NextResponse.json(
        { error: 'Plan not found' }, 
        { status: 404 }
      );
    }

    // Calculate proration
    const currentPeriodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const currentPlanDaily = subscription.plans.amount_in_cents / 30;
    const newPlanDaily = newPlan.amount_in_cents / 30;
    
    const credit = Math.floor(currentPlanDaily * daysRemaining);
    const chargeNow = Math.max(0, newPlan.amount_in_cents - credit);

    const isUpgrade = newPlan.amount_in_cents > subscription.plans.amount_in_cents;
    const isDowngrade = newPlan.amount_in_cents < subscription.plans.amount_in_cents;

    // Handle upgrade (charge immediately)
    if (isUpgrade && chargeNow > 0) {
      // Validate payment source is available
      if (!subscription.payment_sources || subscription.payment_sources.status !== 'AVAILABLE') {
        return NextResponse.json(
          { error: 'Payment source not available' }, 
          { status: 400 }
        );
      }

      // Create immediate invoice for proration
      const immediateInvoice = await createInvoice({
        subscription_id: subscription.id,
        workspace_id: subscription.workspace_id,
        period_start: now.toISOString(),
        period_end: currentPeriodEnd.toISOString(),
        amount_in_cents: chargeNow,
        status: 'pending'
      });

      // Create transaction in Wompi
      const reference = generateTransactionReference(immediateInvoice.id);
      const transactionData = {
        amount_in_cents: chargeNow,
        currency: 'COP',
        customer_email: subscription.payment_sources.customer_email,
        payment_method: {
          type: subscription.payment_sources.type,
          installments: 1
        },
        payment_source_id: subscription.payment_sources.wompi_id,
        reference,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`
      };

      // Add recurrent flag for cards
      if (subscription.payment_sources.type === 'CARD') {
        transactionData.recurrent = true;
      }

      const wompiTransaction = await wompiClient.createTransaction(transactionData);

      // Save transaction to database
      await createTransaction({
        invoice_id: immediateInvoice.id,
        workspace_id: subscription.workspace_id,
        wompi_id: wompiTransaction.id,
        amount_in_cents: wompiTransaction.amount_in_cents,
        status: wompiTransaction.status,
        payment_method_type: subscription.payment_sources.type,
        reference: wompiTransaction.reference,
        status_message: wompiTransaction.status_message,
        raw_payload: wompiTransaction
      });

      // Update invoice with transaction ID
      await updateInvoice(immediateInvoice.id, {
        wompi_transaction_id: wompiTransaction.id
      });

      // If transaction is not approved, return error
      if (wompiTransaction.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Payment failed', transaction_status: wompiTransaction.status }, 
          { status: 400 }
        );
      }
    }

    // Update subscription with new plan
    const metadata = isDowngrade ? { credit_cents: credit } : {};
    
    await updateSubscription(params.id, {
      plan_id: new_plan_id,
      metadata
    });

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan_id: new_plan_id,
        metadata
      },
      proration: {
        days_remaining,
        credit_cents: credit,
        charge_now_cents: chargeNow,
        is_upgrade,
        is_downgrade
      }
    });

  } catch (error) {
    console.error('Error changing plan:', error);
    return NextResponse.json(
      { error: 'Failed to change plan' }, 
      { status: 500 }
    );
  }
}


