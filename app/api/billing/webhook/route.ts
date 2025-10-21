// app/api/billing/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature, WompiEvent } from '@/lib/wompi/utils';
import { 
  upsertTransaction, 
  updateInvoice, 
  updateSubscription,
  getInvoiceByWompiTransactionId 
} from '@/db/billing';
import { wompiConfig } from '@/lib/wompi/config';

export async function POST(req: NextRequest) {
  try {
    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    const event: WompiEvent = await req.json();
    console.log('Received Wompi webhook:', event.event);

    // Validate webhook signature
    if (!validateWebhookSignature(event)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' }, 
        { status: 401 }
      );
    }

    // Process event based on type
    switch (event.event) {
      case 'transaction.updated':
        await handleTransactionUpdated(event);
        break;
      
      case 'payment_source.updated':
        await handlePaymentSourceUpdated(event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    );
  }
}

async function handleTransactionUpdated(event: WompiEvent) {
  const transaction = event.data.transaction;
  console.log(`Processing transaction ${transaction.id} with status ${transaction.status}`);

  // Upsert transaction in database
  await upsertTransaction({
    wompi_id: transaction.id,
    amount_in_cents: transaction.amount_in_cents,
    status: transaction.status,
    payment_method_type: transaction.payment_method_type,
    reference: transaction.reference,
    status_message: transaction.status_message,
    raw_payload: transaction
  });

  // Find invoice by transaction ID
  const invoice = await getInvoiceByWompiTransactionId(transaction.id);
  if (!invoice) {
    console.log(`No invoice found for transaction ${transaction.id}`);
    return;
  }

  // Update invoice and subscription based on transaction status
  switch (transaction.status) {
    case 'APPROVED':
      console.log(`Transaction ${transaction.id} approved`);
      
      // Mark invoice as paid
      await updateInvoice(invoice.id, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });

      // Mark subscription as active
      await updateSubscription(invoice.subscription_id, {
        status: 'active'
      });

      // TODO: Send confirmation email
      console.log(`Invoice ${invoice.id} marked as paid`);
      break;

    case 'DECLINED':
      console.log(`Transaction ${transaction.id} declined`);
      
      // Mark invoice as failed
      await updateInvoice(invoice.id, {
        status: 'failed',
        attempt_count: invoice.attempt_count + 1,
        next_retry_at: getNextRetryDate(invoice.attempt_count + 1).toISOString()
      });

      // TODO: Send failure notification email
      console.log(`Invoice ${invoice.id} marked as failed`);
      break;

    case 'ERROR':
      console.log(`Transaction ${transaction.id} error`);
      
      // Mark invoice as failed
      await updateInvoice(invoice.id, {
        status: 'failed',
        attempt_count: invoice.attempt_count + 1,
        next_retry_at: getNextRetryDate(invoice.attempt_count + 1).toISOString()
      });

      // TODO: Alert team about system error
      console.log(`Invoice ${invoice.id} marked as failed due to error`);
      break;

    case 'VOIDED':
      console.log(`Transaction ${transaction.id} voided`);
      
      // Mark invoice as refunded
      await updateInvoice(invoice.id, {
        status: 'refunded'
      });

      // TODO: Handle refund logic
      console.log(`Invoice ${invoice.id} marked as refunded`);
      break;

    case 'PENDING':
      console.log(`Transaction ${transaction.id} pending`);
      // No action needed, wait for final status
      break;

    default:
      console.log(`Unknown transaction status: ${transaction.status}`);
  }
}

async function handlePaymentSourceUpdated(event: WompiEvent) {
  const paymentSource = event.data.payment_source;
  console.log(`Processing payment source ${paymentSource.id} with status ${paymentSource.status}`);

  // TODO: Update payment source in database
  // TODO: Notify user if payment source becomes unavailable
  // TODO: Suggest alternative payment methods
}

function getNextRetryDate(attemptCount: number): Date {
  const retryDays = [2, 5, 9]; // Día +2, +5, +9
  const daysToAdd = retryDays[attemptCount - 1] || 12; // Default to +12 if more than 3 attempts
  
  const nextRetry = new Date();
  nextRetry.setDate(nextRetry.getDate() + daysToAdd);
  return nextRetry;
}

