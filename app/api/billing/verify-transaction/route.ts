// app/api/billing/verify-transaction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wompiConfig } from '@/lib/wompi/config';
import { supabaseServer } from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('id');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    // Consultar transacción en Wompi
    const wompiResponse = await fetch(
      `${wompiConfig.baseUrl}/v1/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${wompiConfig.privateKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!wompiResponse.ok) {
      throw new Error('Error consulting Wompi transaction');
    }

    const wompiData = await wompiResponse.json();
    const transaction = wompiData.data;

    // Buscar invoice por referencia
    const { data: invoice, error: invoiceError } = await supabaseServer
      .from('invoices')
      .select('*')
      .eq('reference', transaction.reference)
      .single();

    if (invoiceError) {
      console.error('Invoice not found:', invoiceError);
    }

    // Si la transacción es APPROVED, crear suscripción
    if (transaction.status === 'APPROVED' && invoice) {
      // Buscar el plan
      const { data: plan } = await supabaseServer
        .from('plans')
        .select('*')
        .eq('id', invoice.plan_id)
        .single();

      if (plan) {
        // Crear workspace si no existe (simplificado)
        const { data: workspace } = await supabaseServer
          .from('workspaces')
          .select('id')
          .eq('name', `Workspace-${transaction.customer_email}`)
          .single();

        let workspaceId = workspace?.id;

        if (!workspaceId) {
          const { data: newWorkspace } = await supabaseServer
            .from('workspaces')
            .insert({
              name: `Workspace-${transaction.customer_email}`,
              description: 'Workspace creado automáticamente',
              is_home: true
            })
            .select()
            .single();
          
          workspaceId = newWorkspace?.id;
        }

        if (workspaceId) {
          // Crear suscripción
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          const { data: subscription } = await supabaseServer
            .from('subscriptions')
            .insert({
              workspace_id: workspaceId,
              plan_id: plan.id,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              billing_day: now.getDate()
            })
            .select()
            .single();

          // Actualizar invoice
          await supabaseServer
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              wompi_transaction_id: transaction.id,
              subscription_id: subscription?.id
            })
            .eq('id', invoice.id);

          // Crear registro de transacción
          await supabaseServer
            .from('transactions')
            .insert({
              invoice_id: invoice.id,
              workspace_id: workspaceId,
              wompi_id: transaction.id,
              amount_in_cents: transaction.amount_in_cents,
              status: transaction.status,
              payment_method_type: transaction.payment_method_type,
              reference: transaction.reference,
              raw_payload: transaction
            });
        }
      }
    }

    return NextResponse.json({ transaction });

  } catch (error) {
    console.error('Error verifying transaction:', error);
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    );
  }
}
