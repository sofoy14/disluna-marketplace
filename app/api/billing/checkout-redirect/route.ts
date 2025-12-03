// app/api/billing/checkout-redirect/route.ts
// Endpoint que redirige directamente a Wompi Web Checkout
// Usa HTTP redirect en lugar de JSON response para evitar problemas de fetch

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIntegritySignature, generateTransactionReference } from '@/lib/wompi/utils';
import { validateWompiConfig, getWompiCheckoutUrl, wompiConfig } from '@/lib/wompi/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function calculatePeriodEnd(billingPeriod: string, startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  if (billingPeriod === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
}

export async function GET(req: NextRequest) {
  console.log('[Checkout Redirect] ========== START ==========');
  
  try {
    const { searchParams } = new URL(req.url);
    const plan_id = searchParams.get('plan_id');
    const workspace_id = searchParams.get('workspace_id');
    
    console.log('[Checkout Redirect] Params:', { plan_id, workspace_id });

    // Validate params
    if (!plan_id || !workspace_id) {
      console.error('[Checkout Redirect] Missing params');
      return NextResponse.redirect(new URL('/onboarding?error=missing_params', req.url));
    }

    // Validate Wompi config
    const validation = validateWompiConfig();
    if (!validation.isValid) {
      console.error('[Checkout Redirect] Wompi config invalid');
      return NextResponse.redirect(new URL('/onboarding?error=wompi_config', req.url));
    }

    // Get plan
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('[Checkout Redirect] Plan not found:', planError);
      return NextResponse.redirect(new URL('/onboarding?error=plan_not_found', req.url));
    }
    console.log('[Checkout Redirect] Plan:', plan.name);

    // Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      console.error('[Checkout Redirect] Workspace not found:', workspaceError);
      return NextResponse.redirect(new URL('/onboarding?error=workspace_not_found', req.url));
    }
    console.log('[Checkout Redirect] Workspace user:', workspace.user_id);

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', workspace.user_id)
      .single();

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(workspace.user_id);
    
    if (userError || !userData.user?.email) {
      console.error('[Checkout Redirect] User email not found:', userError);
      return NextResponse.redirect(new URL('/onboarding?error=user_not_found', req.url));
    }
    console.log('[Checkout Redirect] User email:', userData.user.email);

    // Generate reference
    const wompiReference = generateTransactionReference('SUB');
    const now = new Date();
    const periodEnd = calculatePeriodEnd(plan.billing_period, now);
    const amountToCharge = plan.amount_in_cents;

    // Check for existing pending subscription
    const { data: pendingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let subscription;
    
    if (!pendingSubscription) {
      const { data: newSubscription, error: createSubError } = await supabase
        .from('subscriptions')
        .insert({
          workspace_id,
          user_id: workspace.user_id,
          plan_id,
          status: 'pending',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          wompi_reference: wompiReference,
          cancel_at_period_end: false,
          billing_day: now.getDate()
        })
        .select()
        .single();

      if (createSubError) {
        console.error('[Checkout Redirect] Error creating subscription:', createSubError);
        return NextResponse.redirect(new URL('/onboarding?error=subscription_create', req.url));
      }
      subscription = newSubscription;
    } else {
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id,
          wompi_reference: wompiReference,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', pendingSubscription.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Checkout Redirect] Error updating subscription:', updateError);
        return NextResponse.redirect(new URL('/onboarding?error=subscription_update', req.url));
      }
      subscription = updatedSub;
    }
    console.log('[Checkout Redirect] Subscription ID:', subscription.id);

    // Create invoice
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('reference', wompiReference)
      .single();
    
    if (!existingInvoice) {
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          subscription_id: subscription.id,
          workspace_id,
          plan_id,
          amount_in_cents: amountToCharge,
          currency: 'COP',
          status: 'pending',
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          reference: wompiReference,
          attempt_count: 0
        });

      if (invoiceError) {
        console.error('[Checkout Redirect] Error creating invoice:', invoiceError);
      }
    }

    // Generate integrity signature
    const signature = generateIntegritySignature({
      reference: wompiReference,
      amount_in_cents: amountToCharge,
      currency: 'COP'
    });

    // Build redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aliado.pro';
    const redirectUrl = `${appUrl}/billing/success`;

    // Build Wompi checkout URL with all params
    const checkoutBaseUrl = getWompiCheckoutUrl();
    const params = new URLSearchParams({
      'public-key': wompiConfig.publicKey,
      'currency': 'COP',
      'amount-in-cents': amountToCharge.toString(),
      'reference': wompiReference,
      'signature:integrity': signature,
      'redirect-url': redirectUrl,
      'customer-data:email': userData.user.email,
      'customer-data:full-name': profile?.display_name || 'Usuario',
      'customer-data:legal-id-type': 'CC',
      'collect-customer-legal-id': 'true'
    });

    const fullCheckoutUrl = `${checkoutBaseUrl}?${params.toString()}`;
    
    console.log('[Checkout Redirect] SUCCESS! Redirecting to:', checkoutBaseUrl);
    console.log('[Checkout Redirect] Reference:', wompiReference);
    console.log('[Checkout Redirect] Amount:', amountToCharge);
    console.log('[Checkout Redirect] ========== END ==========');

    // HTTP Redirect to Wompi
    return NextResponse.redirect(fullCheckoutUrl);

  } catch (error) {
    console.error('[Checkout Redirect] ERROR:', error);
    return NextResponse.redirect(new URL('/onboarding?error=server_error', req.url));
  }
}

