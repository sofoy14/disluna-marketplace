// app/api/cron/billing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { 
  getSubscriptionsDueToday, 
  extendSubscriptionPeriod 
} from '@/db/subscriptions';
import { 
  createInvoice, 
  markInvoiceAsPaid, 
  markInvoiceAsFailed 
} from '@/db/invoices';
import { 
  createTransaction 
} from '@/db/transactions';
import { 
  generateTransactionReference, 
  isPaymentSourceAvailable 
} from '@/lib/wompi/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.WOMPI_CRON_SECRET}`) {
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

    console.log('Starting billing cron job...');

    // Get subscriptions due today
    const subscriptions = await getSubscriptionsDueToday();
    console.log(`Found ${subscriptions.length} subscriptions due today`);

    let processedCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Skip if subscription is set to cancel at period end
        if (subscription.cancel_at_period_end) {
          console.log(`Skipping subscription ${subscription.id} - set to cancel`);
          continue;
        }

        // Validate payment source is available
        if (!subscription.payment_sources || !isPaymentSourceAvailable(subscription.payment_sources.status)) {
          console.log(`Skipping subscription ${subscription.id} - payment source not available`);
          // Mark subscription as requiring action
          await extendSubscriptionPeriod(subscription.id);
          continue;
        }

        // Create invoice
        const invoice = await createInvoice({
          subscription_id: subscription.id,
          workspace_id: subscription.workspace_id,
          amount_in_cents: subscription.plans.amount_in_cents,
          status: 'pending',
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
          attempt_count: 0
        });

        console.log(`Created invoice ${invoice.id} for subscription ${subscription.id}`);

        // Create transaction in Wompi
        const reference = generateTransactionReference(invoice.id);
        const transactionData = {
          amount_in_cents: subscription.plans.amount_in_cents,
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
        console.log(`Created Wompi transaction ${wompiTransaction.id} for invoice ${invoice.id}`);

        // Save transaction to database
        await createTransaction({
          invoice_id: invoice.id,
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
        await markInvoiceAsPaid(invoice.id, wompiTransaction.id);

        // Extend subscription period
        await extendSubscriptionPeriod(subscription.id);

        console.log(`Extended subscription ${subscription.id} period`);
        processedCount++;

      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        errorCount++;
        
        // Mark subscription as past due if there's an error
        try {
          await extendSubscriptionPeriod(subscription.id);
        } catch (updateError) {
          console.error(`Error updating subscription ${subscription.id} status:`, updateError);
        }
      }
    }

    console.log(`Billing cron completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total_subscriptions: subscriptions.length
    });

  } catch (error) {
    console.error('Billing cron error:', error);
    return NextResponse.json(
      { error: 'Billing cron failed' }, 
      { status: 500 }
    );
  }
  
  /*
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

    console.log('Starting billing cron job...');

    // Get subscriptions due today
    const subscriptions = await getSubscriptionsDueToday();
    console.log(`Found ${subscriptions.length} subscriptions due today`);

    let processedCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Skip if subscription is set to cancel at period end
        if (subscription.cancel_at_period_end) {
          console.log(`Skipping subscription ${subscription.id} - set to cancel`);
          continue;
        }

        // Validate payment source is available
        if (!subscription.payment_sources || !isPaymentSourceAvailable(subscription.payment_sources.status)) {
          console.log(`Skipping subscription ${subscription.id} - payment source not available`);
          // Mark subscription as requiring action
          await updateSubscription(subscription.id, { status: 'past_due' });
          continue;
        }

        // Create invoice
        const invoice = await createInvoice({
          subscription_id: subscription.id,
          workspace_id: subscription.workspace_id,
          period_start: subscription.current_period_start,
          period_end: subscription.current_period_end,
          amount_in_cents: subscription.plans.amount_in_cents,
          status: 'pending'
        });

        console.log(`Created invoice ${invoice.id} for subscription ${subscription.id}`);

        // Create transaction in Wompi
        const reference = generateTransactionReference(invoice.id);
        const transactionData = {
          amount_in_cents: subscription.plans.amount_in_cents,
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
        console.log(`Created Wompi transaction ${wompiTransaction.id} for invoice ${invoice.id}`);

        // Save transaction to database
        await createTransaction({
          invoice_id: invoice.id,
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
        await updateInvoice(invoice.id, {
          wompi_transaction_id: wompiTransaction.id
        });

        // Extend subscription period
        const newPeriodStart = new Date(subscription.current_period_end);
        const newPeriodEnd = new Date(newPeriodStart);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await updateSubscription(subscription.id, {
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString()
        });

        console.log(`Extended subscription ${subscription.id} period`);
        processedCount++;

      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error);
        errorCount++;
        
        // Mark subscription as past due if there's an error
        try {
          await updateSubscription(subscription.id, { status: 'past_due' });
        } catch (updateError) {
          console.error(`Error updating subscription ${subscription.id} status:`, updateError);
        }
      }
    }

    console.log(`Billing cron completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total_subscriptions: subscriptions.length
    });

  } catch (error) {
    console.error('Billing cron error:', error);
    return NextResponse.json(
      { error: 'Billing cron failed' }, 
      { status: 500 }
    );
  }
  */
}




