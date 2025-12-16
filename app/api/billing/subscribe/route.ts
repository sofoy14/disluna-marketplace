// app/api/billing/subscribe/route.ts
// Endpoint unificado para iniciar una suscripción
// Crea subscription + invoice + genera datos de checkout ANTES de enviar a Wompi

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-client';
import { generateIntegritySignature, generateTransactionReference } from '@/lib/wompi/utils';
import { validateWompiConfig, getWompiCheckoutUrl, wompiConfig } from '@/lib/wompi/config';
import { getSessionUser } from '@/src/server/auth/session';
import { assertWorkspaceAccess } from '@/src/server/workspaces/access';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Calcular fecha de fin del período
function calculatePeriodEnd(billingPeriod: string, startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  if (billingPeriod === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
}

// Get applicable special offer for a plan
async function getSpecialOffer(planId: string, workspaceId: string) {
  const supabase = getSupabaseServer();
  // Check if user has had any previous subscriptions
  const { count: prevSubCount } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'canceled', 'expired']);
  
  // Only apply first month offers if user has no previous subscriptions
  if (prevSubCount && prevSubCount > 0) {
    return null;
  }

  // Get active special offer for this plan
  const { data: offer } = await supabase
    .from('special_offers')
    .select('*')
    .eq('plan_id', planId)
    .eq('is_active', true)
    .eq('applies_to', 'first_month')
    .lte('valid_from', new Date().toISOString())
    .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
    .single();

  return offer;
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  console.log('[Subscribe API] ========== START ==========');
  
  try {
    // Verificar configuración de Wompi
    console.log('[Subscribe API] Validating Wompi config...');
    const validation = validateWompiConfig();
    if (!validation.isValid) {
      console.error('[Subscribe API] Wompi config invalid:', validation.missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuración de Wompi incompleta',
          missingFields: validation.missingFields
        },
        { status: 400 }
      );
    }
    console.log('[Subscribe API] Wompi config OK');

    const body = await req.json();
    const { plan_id, workspace_id } = body;
    console.log('[Subscribe API] Request body:', { plan_id, workspace_id });

    if (!plan_id || !workspace_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: plan_id and workspace_id' },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const access = await assertWorkspaceAccess(supabase, workspace_id, user.id).catch(() => null);
    if (!access) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (access.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: 'Only workspace admins can start checkout' },
        { status: 403 }
      );
    }

    // Verificar si ya existe una suscripción activa
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ya tienes una suscripción activa',
          subscription: existingSubscription
        },
        { status: 409 }
      );
    }

    // Obtener detalles del plan
    console.log('[Subscribe API] Fetching plan:', plan_id);
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('[Subscribe API] Plan error:', planError);
      return NextResponse.json(
        { success: false, error: 'Plan not found or inactive', details: planError?.message },
        { status: 404 }
      );
    }
    console.log('[Subscribe API] Plan found:', plan.name);

    // Obtener workspace y usuario
    console.log('[Subscribe API] Fetching workspace:', workspace_id);
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      console.error('[Subscribe API] Workspace error:', workspaceError);
      return NextResponse.json(
        { success: false, error: 'Workspace not found', details: workspaceError?.message },
        { status: 404 }
      );
    }
    console.log('[Subscribe API] Workspace found, user_id:', workspace.user_id);

    // Obtener perfil y email del usuario
    console.log('[Subscribe API] Fetching profile...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', workspace.user_id)
      .single();

    console.log('[Subscribe API] Fetching user email...');
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(workspace.user_id);
    
    if (userError || !userData.user?.email) {
      console.error('[Subscribe API] User email error:', userError);
      return NextResponse.json(
        { success: false, error: 'User email not found', details: userError?.message },
        { status: 404 }
      );
    }
    console.log('[Subscribe API] User email found:', userData.user.email);

    // Generar referencia única para esta transacción
    const wompiReference = generateTransactionReference('SUB');

    // Calcular fechas del período
    const now = new Date();
    const periodEnd = calculatePeriodEnd(plan.billing_period, now);

    // Determinar el monto a cobrar
    let amountToCharge = plan.amount_in_cents;
    let specialOffer = null;
    let isFirstMonth = false;
    
    // Check for special offers (only for monthly plans)
    if (plan.billing_period === 'monthly') {
      specialOffer = await getSpecialOffer(plan_id, workspace_id);
      
      if (specialOffer) {
        if (specialOffer.discount_type === 'fixed_price') {
          amountToCharge = specialOffer.discount_value;
          isFirstMonth = true;
        } else if (specialOffer.discount_type === 'percentage') {
          amountToCharge = Math.round(plan.amount_in_cents * (1 - specialOffer.discount_value / 100));
          isFirstMonth = true;
        }
      }
    }

    // Verificar si hay una suscripción pendiente existente
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
      // Crear nueva suscripción en estado pending
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
        console.error('Error creating subscription:', createSubError);
        throw new Error(`Error creating subscription: ${createSubError.message}`);
      }
      subscription = newSubscription;
    } else {
      // Actualizar la suscripción pendiente existente con el nuevo plan
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
        throw new Error(`Error updating subscription: ${updateError.message}`);
      }
      subscription = updatedSub;
    }

    // Verificar si ya hay un invoice con esta referencia
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('reference', wompiReference)
      .single();
    
    let invoice;
    if (!existingInvoice) {
      // Crear invoice con el monto a cobrar (puede ser precio especial o normal)
      const { data: newInvoice, error: invoiceError } = await supabase
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
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        throw new Error(`Error creating invoice: ${invoiceError.message}`);
      }
      invoice = newInvoice;
    } else {
      invoice = existingInvoice;
    }

    // Generar firma de integridad para Wompi
    const signature = generateIntegritySignature({
      reference: wompiReference,
      amount_in_cents: amountToCharge,
      currency: 'COP'
    });

    // Use production URL as default, never localhost in production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aliado.pro';
    const redirectUrl = `${appUrl}/billing/success`;

    // Generar datos de checkout para Wompi Web Checkout
    const checkoutData: Record<string, string> = {
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
    };

    // Format amount for display
    const formatAmount = (cents: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(cents / 100);
    };

    const responseData = {
      success: true,
      data: {
        subscription_id: subscription.id,
        invoice_id: invoice.id,
        reference: wompiReference,
        checkout_url: getWompiCheckoutUrl(),
        checkout_data: checkoutData,
        is_first_month: isFirstMonth,
        special_offer: specialOffer ? {
          id: specialOffer.id,
          name: specialOffer.name,
          description: specialOffer.description,
          discount_type: specialOffer.discount_type,
          discount_value: specialOffer.discount_value
        } : null,
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          amount_in_cents: plan.amount_in_cents,
          billing_period: plan.billing_period,
          features: plan.features
        },
        amount_to_charge: amountToCharge,
        original_amount: plan.amount_in_cents,
        amount_display: isFirstMonth 
          ? `$${formatAmount(amountToCharge)} COP (primer mes especial - luego $${formatAmount(plan.amount_in_cents)} COP/mes)` 
          : `$${formatAmount(amountToCharge)} COP${plan.billing_period === 'yearly' ? '/año' : '/mes'}`
      }
    };

    console.log('[Subscribe API] SUCCESS! Checkout URL:', responseData.data.checkout_url);
    console.log('[Subscribe API] Reference:', responseData.data.reference);
    console.log('[Subscribe API] Amount:', responseData.data.amount_to_charge);
    console.log('[Subscribe API] ========== END SUCCESS ==========');
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[Subscribe API] ========== ERROR ==========');
    console.error('[Subscribe API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error initiating subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
