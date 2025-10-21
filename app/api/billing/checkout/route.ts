// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { wompiConfig } from '@/lib/wompi/config';
import { supabaseServer } from '@/lib/supabase/server-client';

export async function POST(req: NextRequest) {
  try {
    console.log('Creating checkout...');
    const { 
      plan_id, 
      customer_email, 
      customer_name,
      special_offer = false 
    } = await req.json();

    console.log('Request data:', { plan_id, customer_email, customer_name, special_offer });

    // Obtener el plan
    const { data: plan, error: planError } = await supabaseServer
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('Plan error:', planError);
      return NextResponse.json(
        { error: 'Plan not found', details: planError },
        { status: 404 }
      );
    }

    console.log('Plan found:', plan.name);

    // Calcular monto (oferta especial o precio regular)
    let amountInCents = plan.amount_in_cents;
    if (special_offer) {
      // Aplicar oferta especial de $1 USD (aproximadamente 4000 COP)
      amountInCents = 4000; // $1 USD en centavos
    }

    // Generar referencia única
    const reference = `SUB-${plan_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generar firma de integridad
    const integritySecret = wompiConfig.integritySecret;
    if (!integritySecret) {
      console.error('WOMPI_INTEGRITY_SECRET not configured');
      return NextResponse.json(
        { error: 'WOMPI_INTEGRITY_SECRET not configured' },
        { status: 500 }
      );
    }

    console.log('Generating signature...');
    const concatString = `${reference}${amountInCents}COP${integritySecret}`;
    const signature = crypto.createHash('sha256').update(concatString).digest('hex');
    console.log('Signature generated');

    // Crear invoice temporal para tracking
    console.log('Creating invoice...');
    const { data: invoice, error: invoiceError } = await supabaseServer
      .from('invoices')
      .insert({
        plan_id: plan_id,
        subscription_id: null, // Se asignará después del pago
        workspace_id: null, // Se asignará después del pago
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 días
        amount_in_cents: amountInCents,
        currency: 'COP',
        status: 'pending',
        reference: reference
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice error:', invoiceError);
      return NextResponse.json(
        { error: 'Failed to create invoice', details: invoiceError },
        { status: 500 }
      );
    }

    console.log('Invoice created:', invoice.id);

    return NextResponse.json({
      checkout_data: {
        public_key: wompiConfig.publicKey,
        currency: 'COP',
        amount_in_cents: amountInCents,
        reference: reference,
        signature: signature,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/billing/success`,
        customer_data: {
          email: customer_email,
          full_name: customer_name
        },
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          original_amount: plan.amount_in_cents,
          special_offer: special_offer
        },
        invoice_id: invoice.id
      }
    });

  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout', details: error.message },
      { status: 500 }
    );
  }
}