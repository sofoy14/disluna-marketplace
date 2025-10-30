// app/api/webhooks/wompi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { validateWebhookSignature, isTransactionSuccessful, isTransactionFinal } from '@/lib/wompi/utils';
import { 
  getTransactionByWompiId, 
  updateTransactionByWompiId, 
  createTransaction 
} from '@/db/transactions';
import { 
  getInvoiceById, 
  markInvoiceAsPaid, 
  markInvoiceAsFailed 
} from '@/db/invoices';
import { 
  getSubscriptionByWorkspaceId, 
  extendSubscriptionPeriod 
} from '@/db/subscriptions';
import { 
  getPaymentSourceByWompiId, 
  createPaymentSource 
} from '@/db/payment-sources';
import { sendEmail, emailTemplates } from '@/lib/billing/email-notifications';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-wompi-signature') || req.headers.get('wompi-signature') || '';
    
    // Validate webhook signature
    if (!validateWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    console.log('Received Wompi webhook:', event);

    // Process transaction.updated events
    if (event.event === 'transaction.updated') {
      await processTransactionUpdate(event.data);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processTransactionUpdate(transactionData: any) {
  try {
    const { id: wompiTransactionId, status, payment_source_id } = transactionData;

    // Check if transaction already exists
    let transaction = await getTransactionByWompiId(wompiTransactionId);
    
    if (!transaction) {
      console.log(`Transaction ${wompiTransactionId} not found in database, skipping`);
      return;
    }

    // Update transaction status
    await updateTransactionByWompiId(wompiTransactionId, {
      status,
      status_message: transactionData.status_message,
      raw_payload: transactionData
    });

    // Get invoice
    const invoice = await getInvoiceById(transaction.invoice_id);
    
    if (!invoice) {
      console.error(`Invoice ${transaction.invoice_id} not found`);
      return;
    }

    // Process based on transaction status
    if (isTransactionFinal(status)) {
      if (isTransactionSuccessful(status)) {
        await handleSuccessfulTransaction(transactionData, invoice, transaction);
      } else {
        await handleFailedTransaction(transactionData, invoice, transaction);
      }
    }

  } catch (error) {
    console.error('Error processing transaction update:', error);
  }
}

async function handleSuccessfulTransaction(
  transactionData: any, 
  invoice: any, 
  transaction: any
) {
  try {
    // Mark invoice as paid
    await markInvoiceAsPaid(invoice.id, transactionData.id);

    // Create payment source if this is the first successful transaction
    if (transactionData.payment_source_id && !invoice.subscriptions.payment_source_id) {
      try {
        // Get payment source details from Wompi
        const wompiPaymentSource = await wompiClient.getPaymentSource(transactionData.payment_source_id);
        
        // Check if payment source already exists
        const existingPaymentSource = await getPaymentSourceByWompiId(transactionData.payment_source_id);
        
        if (!existingPaymentSource) {
          // Create payment source
          await createPaymentSource({
            workspace_id: invoice.workspace_id,
            user_id: invoice.subscriptions.user_id,
            wompi_id: transactionData.payment_source_id,
            type: wompiPaymentSource.type as 'CARD' | 'NEQUI' | 'PSE',
            status: wompiPaymentSource.status,
            customer_email: wompiPaymentSource.customer_email,
            last_four: wompiPaymentSource.last_four,
            expires_at: wompiPaymentSource.expires_at,
            is_default: true // First payment source is default
          });

          console.log(`Created payment source ${transactionData.payment_source_id}`);
        }

        // Update subscription with payment source
        // This would be handled by the subscription update logic
        
      } catch (error) {
        console.error('Error creating payment source:', error);
      }
    }

    // Extend subscription period
    await extendSubscriptionPeriod(invoice.subscription_id);

    // Send success email
    try {
      await sendEmail(
        invoice.subscriptions.payment_sources?.customer_email || 
        invoice.subscriptions.payment_sources?.customer_email,
        emailTemplates.paymentSuccess(invoice)
      );
    } catch (emailError) {
      console.error('Error sending success email:', emailError);
    }

    console.log(`Successfully processed transaction ${transactionData.id}`);

  } catch (error) {
    console.error('Error handling successful transaction:', error);
  }
}

async function handleFailedTransaction(
  transactionData: any, 
  invoice: any, 
  transaction: any
) {
  try {
    // Mark invoice as failed
    await markInvoiceAsFailed(invoice.id, invoice.attempt_count + 1);

    // Send failure email
    try {
      await sendEmail(
        invoice.subscriptions.payment_sources?.customer_email || 
        invoice.subscriptions.payment_sources?.customer_email,
        emailTemplates.paymentFailed(invoice, invoice.attempt_count + 1)
      );
    } catch (emailError) {
      console.error('Error sending failure email:', emailError);
    }

    console.log(`Processed failed transaction ${transactionData.id}`);

  } catch (error) {
    console.error('Error handling failed transaction:', error);
  }
}





