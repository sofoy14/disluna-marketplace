// app/api/billing/subscribe/route.ts
// Endpoint unificado para iniciar una suscripción
// Crea subscription + invoice + genera datos de checkout ANTES de enviar a Wompi

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIntegritySignature, generateTransactionReference } from '@/lib/wompi/utils';
import { validateWompiConfig, getWompiCheckoutUrl, wompiConfig } from '@/lib/wompi/config';

// Cliente de servidor para API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Precio especial primer mes para plan mensual: $4,000 COP = 400000 centavos
const FIRST_MONTH_PRICE_CENTS = 400000;

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

export async function POST(req: NextRequest) {
  try {
    // Verificar configuración de Wompi
    const validation = validateWompiConfig();
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuración de Wompi incompleta',
          missingFields: validation.missingFields
        },
        { status: 400 }
      );
    }

    const { plan_id, workspace_id } = await req.json();

    if (!plan_id || !workspace_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: plan_id and workspace_id' },
        { status: 400 }
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
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return NextResponse.json(
        { success: false, error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    // Obtener workspace y usuario
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Obtener perfil y email del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', workspace.user_id)
      .single();

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(workspace.user_id);
    
    if (userError || !userData.user?.email) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 404 }
      );
    }

    // Generar referencia única para esta transacción
    const wompiReference = generateTransactionReference('SUB');

    // Calcular fechas del período
    const now = new Date();
    const periodEnd = calculatePeriodEnd(plan.billing_period, now);

    // Determinar el monto a cobrar
    let amountToCharge = plan.amount_in_cents;
    let isFirstMonth = false;
    
    if (plan.billing_period === 'monthly') {
      // Verificar si el usuario ya tuvo una suscripción antes
      const { count } = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id)
        .in('status', ['active', 'canceled', 'expired']);
      
      // Si no ha tenido suscripciones previas activas/canceladas/expiradas, aplica primer mes
      if (!count || count === 0) {
        amountToCharge = FIRST_MONTH_PRICE_CENTS;
        isFirstMonth = true;
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

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing/success`;

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

    return NextResponse.json({
      success: true,
      data: {
        subscription_id: subscription.id,
        invoice_id: invoice.id,
        reference: wompiReference,
        checkout_url: getWompiCheckoutUrl(),
        checkout_data: checkoutData,
        is_first_month: isFirstMonth,
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          amount_in_cents: plan.amount_in_cents,
          billing_period: plan.billing_period,
          features: plan.features
        },
        amount_to_charge: amountToCharge,
        amount_display: isFirstMonth 
          ? '$4.000 COP (primer mes especial)' 
          : `$${(amountToCharge / 100).toLocaleString('es-CO')} COP`
      }
    });

  } catch (error) {
    console.error('Error initiating subscription:', error);
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
