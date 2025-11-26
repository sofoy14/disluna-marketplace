// app/api/cron/dunning/route.ts
// Cron job para reintentar pagos fallidos y suspender suscripciones
// Ejecutar diariamente a las 02:00 UTC

import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { 
  getFailedInvoicesForRetry, 
  getSuspendedInvoices,
  markInvoiceAsFailed
} from '@/db/invoices';
import { updateSubscription } from '@/db/subscriptions';
import { createTransaction } from '@/db/transactions';
import { generateRetryReference } from '@/lib/wompi/utils';
import { sendEmail, emailTemplates } from '@/lib/billing/email-notifications';

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

    console.log('🔄 Starting dunning cron job...');

    // 1. Procesar invoices fallidos para reintento
    const failedInvoices = await getFailedInvoicesForRetry();
    console.log(`📋 Found ${failedInvoices.length} failed invoices for retry`);

    let retriedCount = 0;
    let retryErrorCount = 0;

    for (const invoice of failedInvoices) {
      try {
        // Verificar que tiene payment source válido
        if (!invoice.subscriptions?.payment_sources?.wompi_id) {
          console.log(`⚠️ Invoice ${invoice.id} has no payment source, skipping`);
          continue;
        }

        const attemptNumber = (invoice.attempt_count || 0) + 1;
        console.log(`🔄 Retrying invoice ${invoice.id} (attempt ${attemptNumber})`);

        // Crear referencia de reintento
        const reference = generateRetryReference(invoice.id, attemptNumber);

        // Crear transacción en Wompi
        const transactionData = {
          amount_in_cents: invoice.amount_in_cents,
          currency: 'COP',
          customer_email: invoice.subscriptions.payment_sources.customer_email,
          payment_method: {
            type: invoice.subscriptions.payment_sources.type,
            installments: 1
          },
          payment_source_id: invoice.subscriptions.payment_sources.wompi_id,
          reference,
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
          recurrent: invoice.subscriptions.payment_sources.type === 'CARD'
        };

        const wompiTransaction = await wompiClient.createTransaction(transactionData);
        console.log(`💳 Created retry transaction ${wompiTransaction.id}`);

        // Guardar transacción
        await createTransaction({
          invoice_id: invoice.id,
          workspace_id: invoice.workspace_id,
          wompi_id: wompiTransaction.id,
          amount_in_cents: wompiTransaction.amount_in_cents,
          status: wompiTransaction.status,
          payment_method_type: invoice.subscriptions.payment_sources.type,
          reference,
          status_message: wompiTransaction.status_message,
          raw_payload: wompiTransaction
        });

        // Actualizar contador de intentos
        await markInvoiceAsFailed(invoice.id, attemptNumber);

        retriedCount++;

      } catch (error) {
        console.error(`❌ Error retrying invoice ${invoice.id}:`, error);
        retryErrorCount++;
        
        // Incrementar contador aunque falle
        try {
          await markInvoiceAsFailed(invoice.id, (invoice.attempt_count || 0) + 1);
        } catch (updateError) {
          console.error(`❌ Error updating attempt count:`, updateError);
        }
      }
    }

    // 2. Suspender suscripciones con demasiados fallos
    const suspendedInvoices = await getSuspendedInvoices();
    console.log(`📋 Found ${suspendedInvoices.length} invoices requiring subscription suspension`);

    let suspendedCount = 0;

    for (const invoice of suspendedInvoices) {
      try {
        await updateSubscription(invoice.subscription_id, {
          status: 'past_due'
        });

        // Enviar email de suspensión
        try {
          const userEmail = invoice.subscriptions?.payment_sources?.customer_email;
          if (userEmail) {
            await sendEmail(userEmail, emailTemplates.subscriptionSuspended(invoice.subscriptions));
          }
        } catch (emailError) {
          console.error(`⚠️ Error sending suspension email:`, emailError);
        }

        console.log(`🔴 Suspended subscription ${invoice.subscription_id}`);
        suspendedCount++;

      } catch (error) {
        console.error(`❌ Error suspending subscription ${invoice.subscription_id}:`, error);
      }
    }

    console.log(`✅ Dunning cron completed. Retried: ${retriedCount}, Retry errors: ${retryErrorCount}, Suspended: ${suspendedCount}`);

    return NextResponse.json({
      success: true,
      retried: retriedCount,
      retry_errors: retryErrorCount,
      suspended: suspendedCount,
      total_failed: failedInvoices.length,
      total_suspended: suspendedInvoices.length
    });

  } catch (error) {
    console.error('❌ Dunning cron error:', error);
    return NextResponse.json({ error: 'Dunning cron failed' }, { status: 500 });
  }
}
