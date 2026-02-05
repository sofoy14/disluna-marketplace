// app/api/wompi/webhook/route.ts
// Webhook principal para procesar eventos de Wompi

import { NextRequest, NextResponse } from 'next/server';
import { isTransactionSuccessful, isTransactionFinal } from '@/lib/wompi/utils';
import { wompiClient } from '@/lib/wompi/client';
import {
  getInvoiceByReference,
  markInvoiceAsFailed,
  markInvoiceAsPaid,
  updateInvoice
} from '@/db/invoices';
import {
  activateSubscription,
  updateSubscription,
  getSubscriptionById
} from '@/db/subscriptions';
import {
  createTransaction,
  getTransactionByWompiId,
  updateTransactionByWompiId
} from '@/db/transactions';
import {
  getPaymentSourceByWompiId,
  createPaymentSource
} from '@/db/payment-sources';
import { sendEmail, emailTemplates } from '@/lib/billing/email-notifications';
import { getSupabaseServer } from '@/lib/supabase/server-client';
import { getWompiIdempotencyKey, verifyWompiWebhookSignature } from '@/lib/wompi/webhook';
import {
  getWompiWebhookEventByKey,
  markWompiWebhookEventFailed,
  markWompiWebhookEventProcessed,
  upsertWompiWebhookEventProcessing
} from '@/lib/wompi/webhook-event-store';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  let idempotencyKey: string | null = null;
  try {
    const body = await req.text();

    // Wompi sends signature in different headers depending on version
    const signature = req.headers.get('x-event-checksum') ||
      req.headers.get('X-Event-Checksum') ||
      req.headers.get('x-wompi-signature') ||
      req.headers.get('wompi-signature') || '';

    console.log('📨 Received Wompi webhook:', {
      signatureHeader: signature ? signature.substring(0, 30) + '...' : 'none',
      bodyLength: body.length,
      headers: {
        'x-event-checksum': req.headers.get('x-event-checksum') ? 'present' : 'absent',
        'x-wompi-signature': req.headers.get('x-wompi-signature') ? 'present' : 'absent',
      }
    });

    // Parse the event first to check if it's a valid Wompi webhook
    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body as JSON');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    idempotencyKey = getWompiIdempotencyKey(event);
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Unsupported event payload' }, { status: 400 });
    }

    // SECURITY: Webhook signature validation is ALWAYS required
    // This prevents fraudulent payment attempts and ensures webhooks are genuinely from Wompi
    if (!process.env.WOMPI_WEBHOOK_SECRET) {
      console.error('❌ WOMPI_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!signature) {
      console.warn('⚠️ Webhook received without signature - rejected');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    const isValid = verifyWompiWebhookSignature({
      payload: body,
      signature,
      secret: process.env.WOMPI_WEBHOOK_SECRET
    });

    if (!isValid) {
      // Log failed signature validation for security monitoring
      console.error('❌ Invalid webhook signature:', {
        signaturePresent: !!signature,
        signatureLength: signature?.length,
        bodyLength: body.length,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        timestamp: new Date().toISOString(),
        userAgent: req.headers.get('user-agent'),
      });
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    try {
      const existing = await getWompiWebhookEventByKey(supabase, idempotencyKey);
      if (existing?.status === 'processed') {
        return NextResponse.json({ success: true, received: true, idempotent: true });
      }
    } catch (e) {
      console.warn('Webhook idempotency lookup failed (continuing):', e);
    }

    console.log('📋 Webhook event:', event.event, event.data?.transaction?.id || event.data?.id);

    // Procesar eventos de transacción
    const transactionData = event.data?.transaction || event.data || null;
    const wompiTransactionId = typeof transactionData?.id === 'string' ? transactionData.id : null;
    const reference = typeof transactionData?.reference === 'string' ? transactionData.reference : null;
    const transactionStatus = typeof transactionData?.status === 'string' ? transactionData.status : null;

    try {
      await upsertWompiWebhookEventProcessing({
        supabase,
        idempotencyKey,
        payload: event,
        signature: signature || null,
        eventType: typeof event?.event === 'string' ? event.event : null,
        wompiTransactionId,
        reference,
        status: transactionStatus
      });
    } catch (e) {
      console.warn('Webhook idempotency write failed (continuing):', e);
    }

    // Procesar eventos de transacciÇün
    if (event.event === 'transaction.updated' && transactionData) {
      await processTransactionUpdate(supabase, transactionData);
    }

    try {
      await markWompiWebhookEventProcessed(supabase, idempotencyKey);
    } catch (e) {
      console.warn('Webhook idempotency mark processed failed:', e);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    try {
      if (idempotencyKey) {
        await markWompiWebhookEventFailed({
          supabase,
          idempotencyKey,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } catch (e) {
      console.warn('Webhook idempotency mark failed failed:', e);
    }
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processTransactionUpdate(
  supabase: ReturnType<typeof getSupabaseServer>,
  transactionData: any
) {
  const wompiTransactionId = transactionData.id;
  const status = transactionData.status;
  const reference = transactionData.reference;

  console.log(`🔄 Processing transaction: ${wompiTransactionId}, status: ${status}, ref: ${reference}`);
  console.log(`📝 Transaction details:`, JSON.stringify({
    amount: transactionData.amount_in_cents,
    paymentMethod: transactionData.payment_method_type,
    customerEmail: transactionData.customer_email,
    createdAt: transactionData.created_at,
    finalizedAt: transactionData.finalized_at
  }, null, 2));

  // Solo procesar transacciones finales
  if (!isTransactionFinal(status)) {
    console.log(`⏳ Transaction ${wompiTransactionId} not final yet, status: ${status}`);
    return;
  }

  // Buscar invoice por referencia
  console.log(`🔍 Searching for invoice with reference: "${reference}"`);
  const invoice = await getInvoiceByReference(reference, supabase);

  if (!invoice) {
    console.log(`⚠️ Invoice not found for reference: ${reference}`);

    // Try to find invoice with different reference patterns
    // Sometimes reference might be stored differently
    const possibleRefs = [
      reference,
      reference.toUpperCase(),
      reference.toLowerCase(),
      reference.replace(/^SUB-/, ''),
      `SUB-${reference}`
    ];

    console.log(`🔍 Trying alternative reference patterns:`, possibleRefs);

    // Log recent invoices for debugging
    try {
      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('id, reference, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log(`📋 Recent invoices in database:`, recentInvoices?.map(inv => ({
        id: inv.id.substring(0, 8) + '...',
        reference: inv.reference,
        status: inv.status
      })));
    } catch (e) {
      console.log('⚠️ Could not fetch recent invoices for debugging');
    }

    // If we still can't find it, create a record for manual review
    console.log(`❌ Invoice not found. Transaction ${wompiTransactionId} needs manual review.`);
    console.log(`📧 Customer email: ${transactionData.customer_email}`);
    console.log(`💰 Amount: ${transactionData.amount_in_cents} COP`);
    return;
  }

  console.log(`📄 Found invoice: ${invoice.id}, current status: ${invoice.status}`);

  // Idempotency: if our invoice is already in a final matching state, avoid repeating side-effects (emails, activation).
  if (isTransactionSuccessful(status) && invoice.status === 'paid') {
    console.log(`✅ Invoice already paid (${invoice.id}); skipping duplicate APPROVED webhook processing.`);
    return;
  }

  if (!isTransactionSuccessful(status) && invoice.status === 'failed') {
    console.log(`✅ Invoice already failed (${invoice.id}); skipping duplicate failed webhook processing.`);
    return;
  }

  // Verificar si ya tenemos esta transacción registrada
  let transaction = await getTransactionByWompiId(wompiTransactionId, supabase);

  if (!transaction) {
    // Crear registro de transacción
    try {
      transaction = await createTransaction({
        invoice_id: invoice.id,
        workspace_id: invoice.workspace_id || '',
        wompi_id: wompiTransactionId,
        amount_in_cents: transactionData.amount_in_cents,
        currency: 'COP',
        status,
        payment_method_type: transactionData.payment_method_type || 'UNKNOWN',
        reference,
        status_message: transactionData.status_message,
        raw_payload: transactionData
      }, supabase);
      console.log(`✅ Created transaction record: ${transaction.id}`);
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  } else {
    // Actualizar transacción existente
    await updateTransactionByWompiId(wompiTransactionId, {
      status,
      status_message: transactionData.status_message,
      raw_payload: transactionData
    }, supabase);
    console.log(`📝 Updated transaction: ${wompiTransactionId}`);
  }

  // Procesar según resultado
  if (isTransactionSuccessful(status)) {
    await handleSuccessfulPayment(supabase, transactionData, invoice);
  } else {
    await handleFailedPayment(supabase, transactionData, invoice);
  }
}

async function handleSuccessfulPayment(
  supabase: ReturnType<typeof getSupabaseServer>,
  transactionData: any,
  invoice: any
) {
  console.log(`✅ Processing successful payment for invoice: ${invoice.id}`);

  try {
    // 1. Marcar invoice como pagado
    await markInvoiceAsPaid(invoice.id, transactionData.id, supabase);

    // 2. Obtener la suscripción si existe
    if (invoice.subscription_id) {
      const subscription = await getSubscriptionById(invoice.subscription_id, supabase);

      if (subscription) {
        // 3. Crear/actualizar payment source si viene de tarjeta
        let paymentSourceId = subscription.payment_source_id;

        if (transactionData.payment_source_id) {
          try {
            const existingSource = await getPaymentSourceByWompiId(
              transactionData.payment_source_id,
              supabase
            );

            if (!existingSource) {
              // Obtener detalles del payment source de Wompi
              const wompiSource = await wompiClient.getPaymentSource(transactionData.payment_source_id);

              const newSource = await createPaymentSource({
                workspace_id: invoice.workspace_id,
                user_id: subscription.user_id,
                wompi_id: transactionData.payment_source_id,
                type: wompiSource.type,
                status: wompiSource.status,
                customer_email: wompiSource.customer_email,
                last_four: wompiSource.last_four,
                expires_at: wompiSource.expires_at,
                is_default: true
              }, supabase);

              paymentSourceId = newSource.id;
              console.log(`💳 Created payment source: ${newSource.id}`);
            } else {
              paymentSourceId = existingSource.id;
            }
          } catch (error) {
            console.error('⚠️ Error creating payment source:', error);
          }
        }

        // 4. Activar suscripción
        await activateSubscription(invoice.subscription_id, paymentSourceId, supabase);
        console.log(`🎉 Subscription activated: ${invoice.subscription_id}`);

        // 5. Marcar onboarding como completado
        if (subscription.user_id) {
          await supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              onboarding_step: 'completed'
            })
            .eq('user_id', subscription.user_id);
        }
      }
    }

    // 6. Enviar email de confirmación
    try {
      const userEmail = transactionData.customer_email;
      if (userEmail) {
        await sendEmail(userEmail, emailTemplates.paymentSuccess(invoice));
      }
    } catch (emailError) {
      console.error('⚠️ Error sending success email:', emailError);
    }

    console.log(`✅ Payment processed successfully for invoice: ${invoice.id}`);

  } catch (error) {
    console.error('❌ Error handling successful payment:', error);
    throw error;
  }
}

async function handleFailedPayment(
  supabase: ReturnType<typeof getSupabaseServer>,
  transactionData: any,
  invoice: any
) {
  console.log(`❌ Processing failed payment for invoice: ${invoice.id}`);

  try {
    // Incrementar contador de intentos
    const newAttemptCount = (invoice.attempt_count || 0) + 1;
    await markInvoiceAsFailed(invoice.id, newAttemptCount, supabase);

    // Si hay suscripción y es el primer pago, marcar como incomplete
    if (invoice.subscription_id) {
      const subscription = await getSubscriptionById(invoice.subscription_id, supabase);
      if (subscription?.status === 'pending') {
        await updateSubscription(invoice.subscription_id, { status: 'incomplete' }, supabase);
      }
    }

    // Enviar email de fallo
    try {
      const userEmail = transactionData.customer_email;
      if (userEmail) {
        await sendEmail(userEmail, emailTemplates.paymentFailed(invoice, newAttemptCount));
      }
    } catch (emailError) {
      console.error('⚠️ Error sending failure email:', emailError);
    }

    console.log(`📝 Payment failed, attempt ${newAttemptCount} for invoice: ${invoice.id}`);

  } catch (error) {
    console.error('❌ Error handling failed payment:', error);
    throw error;
  }
}

// GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Wompi webhook endpoint active',
    timestamp: new Date().toISOString()
  });
}
