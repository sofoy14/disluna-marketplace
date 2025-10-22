// app/api/cron/dunning/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { 
  getFailedInvoicesForRetry, 
  getSuspendedInvoices,
  updateInvoice,
  updateSubscription,
  createTransaction 
} from '@/db/billing';
import { generateRetryReference } from '@/lib/wompi/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${wompiConfig.cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    console.log('Starting dunning cron job...');

    // Process failed invoices for retry
    const failedInvoices = await getFailedInvoicesForRetry();
    console.log(`Found ${failedInvoices.length} failed invoices for retry`);

    let retriedCount = 0;
    let retryErrorCount = 0;

    for (const invoice of failedInvoices) {
      try {
        console.log(`Retrying invoice ${invoice.id} (attempt ${invoice.attempt_count + 1})`);

        // Create retry transaction in Wompi
        const reference = generateRetryReference(invoice.id, invoice.attempt_count + 1);
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
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`
        };

        // Add recurrent flag for cards
        if (invoice.subscriptions.payment_sources.type === 'CARD') {
          transactionData.recurrent = true;
        }

        const wompiTransaction = await wompiClient.createTransaction(transactionData);
        console.log(`Created retry transaction ${wompiTransaction.id} for invoice ${invoice.id}`);

        // Save transaction to database
        await createTransaction({
          invoice_id: invoice.id,
          workspace_id: invoice.workspace_id,
          wompi_id: wompiTransaction.id,
          amount_in_cents: wompiTransaction.amount_in_cents,
          status: wompiTransaction.status,
          payment_method_type: invoice.subscriptions.payment_sources.type,
          reference: wompiTransaction.reference,
          status_message: wompiTransaction.status_message,
          raw_payload: wompiTransaction
        });

        // Update invoice with new transaction ID
        await updateInvoice(invoice.id, {
          wompi_transaction_id: wompiTransaction.id,
          attempt_count: invoice.attempt_count + 1
        });

        // TODO: Send retry notification email
        console.log(`Retry transaction created for invoice ${invoice.id}`);
        retriedCount++;

      } catch (error) {
        console.error(`Error retrying invoice ${invoice.id}:`, error);
        retryErrorCount++;
        
        // Update attempt count even if retry failed
        try {
          await updateInvoice(invoice.id, {
            attempt_count: invoice.attempt_count + 1
          });
        } catch (updateError) {
          console.error(`Error updating invoice ${invoice.id} attempt count:`, updateError);
        }
      }
    }

    // Suspend subscriptions with too many failed attempts
    const suspendedInvoices = await getSuspendedInvoices();
    console.log(`Found ${suspendedInvoices.length} invoices to suspend subscriptions`);

    let suspendedCount = 0;

    for (const invoice of suspendedInvoices) {
      try {
        await updateSubscription(invoice.subscription_id, {
          status: 'past_due'
        });

        // TODO: Send suspension notification email
        console.log(`Suspended subscription ${invoice.subscription_id}`);
        suspendedCount++;

      } catch (error) {
        console.error(`Error suspending subscription ${invoice.subscription_id}:`, error);
      }
    }

    console.log(`Dunning cron completed. Retried: ${retriedCount}, Retry errors: ${retryErrorCount}, Suspended: ${suspendedCount}`);

    return NextResponse.json({
      success: true,
      retried: retriedCount,
      retry_errors: retryErrorCount,
      suspended: suspendedCount,
      total_failed_invoices: failedInvoices.length,
      total_suspended_invoices: suspendedInvoices.length
    });

  } catch (error) {
    console.error('Dunning cron error:', error);
    return NextResponse.json(
      { error: 'Dunning cron failed' }, 
      { status: 500 }
    );
  }
}


