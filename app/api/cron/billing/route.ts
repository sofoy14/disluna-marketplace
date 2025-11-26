// app/api/cron/billing/route.ts
// Cron job para procesar cobros recurrentes de suscripciones
// Ejecutar diariamente a las 00:00 UTC

import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { 
  getSubscriptionsDueToday, 
  updateSubscription 
} from '@/db/subscriptions';
import { createInvoice } from '@/db/invoices';
import { createTransaction } from '@/db/transactions';
import { getPlanById } from '@/db/plans';
import { 
  generateTransactionReference, 
  isPaymentSourceAvailable 
} from '@/lib/wompi/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Validar cron secret
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.WOMPI_CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que billing está habilitado
    if (!wompiConfig.isEnabled) {
      return NextResponse.json({ error: 'Billing is not enabled' }, { status: 403 });
    }

    console.log('🔄 Starting billing cron job...');

    // Obtener suscripciones que vencen hoy
    const subscriptions = await getSubscriptionsDueToday();
    console.log(`📋 Found ${subscriptions.length} subscriptions due today`);

    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Saltar si está marcada para cancelar
        if (subscription.cancel_at_period_end) {
          console.log(`⏭️ Skipping ${subscription.id} - set to cancel`);
          await updateSubscription(subscription.id, { status: 'canceled' });
          skippedCount++;
          continue;
        }

        // Verificar payment source disponible
        if (!subscription.payment_sources || 
            !isPaymentSourceAvailable(subscription.payment_sources.status)) {
          console.log(`⚠️ Skipping ${subscription.id} - no valid payment source`);
          await updateSubscription(subscription.id, { status: 'past_due' });
          skippedCount++;
          continue;
        }

        // Obtener plan para calcular nuevo período
        const plan = await getPlanById(subscription.plan_id);
        
        // Calcular nuevo período
        const newPeriodStart = new Date(subscription.current_period_end);
        const newPeriodEnd = new Date(newPeriodStart);
        
        if (plan.billing_period === 'yearly') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + (plan.interval_count || 1));
        }

        // Generar referencia única
        const reference = generateTransactionReference('REN');

        // Crear invoice
        const invoice = await createInvoice({
          subscription_id: subscription.id,
          workspace_id: subscription.workspace_id,
          amount_in_cents: plan.amount_in_cents,
          status: 'pending',
          period_start: newPeriodStart.toISOString(),
          period_end: newPeriodEnd.toISOString(),
          wompi_reference: reference,
          attempt_count: 0
        });

        console.log(`📄 Created invoice ${invoice.id} for subscription ${subscription.id}`);

        // Crear transacción en Wompi
        const transactionData = {
          amount_in_cents: plan.amount_in_cents,
          currency: 'COP',
          customer_email: subscription.payment_sources.customer_email,
          payment_method: {
            type: subscription.payment_sources.type,
            installments: 1
          },
          payment_source_id: subscription.payment_sources.wompi_id,
          reference,
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
          recurrent: subscription.payment_sources.type === 'CARD'
        };

        const wompiTransaction = await wompiClient.createTransaction(transactionData);
        console.log(`💳 Created Wompi transaction ${wompiTransaction.id}`);

        // Guardar transacción en DB
        await createTransaction({
          invoice_id: invoice.id,
          workspace_id: subscription.workspace_id,
          wompi_id: wompiTransaction.id,
          amount_in_cents: wompiTransaction.amount_in_cents,
          status: wompiTransaction.status,
          payment_method_type: subscription.payment_sources.type,
          reference,
          status_message: wompiTransaction.status_message,
          raw_payload: wompiTransaction
        });

        // Extender período de suscripción (el webhook confirmará el pago)
        await updateSubscription(subscription.id, {
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString()
        });

        console.log(`✅ Processed subscription ${subscription.id}`);
        processedCount++;

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error);
        errorCount++;
        
        // Marcar como past_due si falla
        try {
          await updateSubscription(subscription.id, { status: 'past_due' });
        } catch (updateError) {
          console.error(`❌ Error updating status:`, updateError);
        }
      }
    }

    console.log(`✅ Billing cron completed. Processed: ${processedCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      skipped: skippedCount,
      total: subscriptions.length
    });

  } catch (error) {
    console.error('❌ Billing cron error:', error);
    return NextResponse.json({ error: 'Billing cron failed' }, { status: 500 });
  }
}
