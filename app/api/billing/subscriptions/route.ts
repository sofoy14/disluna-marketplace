// app/api/billing/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSubscription, getPaymentSourceById } from '@/db/billing';
import { wompiConfig } from '@/lib/wompi/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    const { plan_id, payment_source_id, workspace_id, special_offer = false } = await req.json();

    // Validate required fields
    if (!plan_id || !payment_source_id) {
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

    // Validate payment source exists and is available
    const paymentSource = await getPaymentSourceById(payment_source_id);
    if (paymentSource.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Payment source not found' }, 
        { status: 404 }
      );
    }

    if (paymentSource.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: 'Payment source is not available' }, 
        { status: 400 }
      );
    }

    // Check if workspace exists and belongs to user
    let finalWorkspaceId = workspace_id;
    if (!finalWorkspaceId) {
      // Get user's home workspace
      const { data: homeWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();
      
      if (!homeWorkspace) {
        return NextResponse.json(
          { error: 'No workspace found' }, 
          { status: 404 }
        );
      }
      
      finalWorkspaceId = homeWorkspace.id;
    } else {
      // Verify workspace belongs to user
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', finalWorkspaceId)
        .eq('user_id', user.id)
        .single();
      
      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' }, 
          { status: 404 }
        );
      }
    }

    // Check if there's already an active subscription for this workspace
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('workspace_id', finalWorkspaceId)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Workspace already has an active subscription' }, 
        { status: 400 }
      );
    }

    // Create subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await createSubscription({
      workspace_id: finalWorkspaceId,
      plan_id,
      payment_source_id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      billing_day: now.getDate()
    });

    // Si es oferta especial, aplicar descuento
    if (special_offer) {
      // Obtener oferta especial activa
      const { data: offer, error: offerError } = await supabase
        .from('special_offers')
        .select('*')
        .eq('is_active', true)
        .eq('applies_to', 'first_month')
        .gte('valid_until', now.toISOString())
        .single();
      
      if (offer && !offerError) {
        // Aplicar oferta a la suscripción
        await supabase
          .from('subscription_offers')
          .insert({
            subscription_id: subscription.id,
            offer_id: offer.id,
            expires_at: periodEnd.toISOString(),
            discount_applied: offer.discount_value
          });
        
        // Obtener el plan para calcular el descuento
        const { data: plan } = await supabase
          .from('plans')
          .select('amount_in_cents')
          .eq('id', plan_id)
          .single();
        
        if (plan) {
          // Crear invoice con descuento para el primer mes
          const discountedAmount = Math.max(100, plan.amount_in_cents - offer.discount_value); // Mínimo $1 USD
          
          await supabase
            .from('invoices')
            .insert({
              subscription_id: subscription.id,
              workspace_id: finalWorkspaceId,
              period_start: now.toISOString(),
              period_end: periodEnd.toISOString(),
              amount_in_cents: discountedAmount,
              currency: offer.currency,
              status: 'pending'
            });
        }
      }
    }

    return NextResponse.json({ 
      subscription,
      special_offer_applied: special_offer
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' }, 
      { status: 500 }
    );
  }
}
