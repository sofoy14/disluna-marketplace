// app/api/wompi/webhook/route.ts
// Webhook principal para procesar eventos de Wompi

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateWebhookSignature, isTransactionSuccessful, isTransactionFinal } from '@/lib/wompi/utils';
import { wompiClient } from '@/lib/wompi/client';
import { 
  getInvoiceByReference,
  markInvoiceAsPaid, 
  markInvoiceAsFailed,
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-wompi-signature') || 
                      req.headers.get('wompi-signature') || 
                      req.headers.get('X-Event-Checksum') || '';
    
    console.log('📨 Received Wompi webhook:', {
      signaturePrefix: signature ? signature.substring(0, 20) + '...' : 'none',
      bodyLength: body.length
    });

    // Validar firma del webhook (desactivar temporalmente en desarrollo)
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && signature && !validateWebhookSignature(body, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('📋 Webhook event:', event.event, event.data?.transaction?.id || event.data?.id);

    // Procesar eventos de transacción
    if (event.event === 'transaction.updated') {
      const transactionData = event.data?.transaction || event.data;
      await processTransactionUpdate(transactionData);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function processTransactionUpdate(transactionData: any) {
  const wompiTransactionId = transactionData.id;
  const status = transactionData.status;
  const reference = transactionData.reference;

  console.log(`🔄 Processing transaction: ${wompiTransactionId}, status: ${status}, ref: ${reference}`);

  // Solo procesar transacciones finales
  if (!isTransactionFinal(status)) {
    console.log(`⏳ Transaction ${wompiTransactionId} not final yet, status: ${status}`);
    return;
  }

  // Buscar invoice por referencia
  const invoice = await getInvoiceByReference(reference);
  
  if (!invoice) {
    console.log(`⚠️ Invoice not found for reference: ${reference}`);
    return;
  }

  console.log(`📄 Found invoice: ${invoice.id}, current status: ${invoice.status}`);

  // Verificar si ya tenemos esta transacción registrada
  let transaction = await getTransactionByWompiId(wompiTransactionId);
  
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
      });
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
    });
    console.log(`📝 Updated transaction: ${wompiTransactionId}`);
  }

  // Procesar según resultado
  if (isTransactionSuccessful(status)) {
    await handleSuccessfulPayment(transactionData, invoice);
  } else {
    await handleFailedPayment(transactionData, invoice);
  }
}

async function handleSuccessfulPayment(transactionData: any, invoice: any) {
  console.log(`✅ Processing successful payment for invoice: ${invoice.id}`);

  try {
    // 1. Marcar invoice como pagado
    await markInvoiceAsPaid(invoice.id, transactionData.id);

    // 2. Obtener la suscripción si existe
    if (invoice.subscription_id) {
      const subscription = await getSubscriptionById(invoice.subscription_id);
      
      if (subscription) {
        // 3. Crear/actualizar payment source si viene de tarjeta
        let paymentSourceId = subscription.payment_source_id;
        
        if (transactionData.payment_source_id) {
          try {
            const existingSource = await getPaymentSourceByWompiId(transactionData.payment_source_id);
            
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
              });
              
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
        await activateSubscription(invoice.subscription_id, paymentSourceId);
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

async function handleFailedPayment(transactionData: any, invoice: any) {
  console.log(`❌ Processing failed payment for invoice: ${invoice.id}`);

  try {
    // Incrementar contador de intentos
    const newAttemptCount = (invoice.attempt_count || 0) + 1;
    await markInvoiceAsFailed(invoice.id, newAttemptCount);

    // Si hay suscripción y es el primer pago, marcar como incomplete
    if (invoice.subscription_id) {
      const subscription = await getSubscriptionById(invoice.subscription_id);
      if (subscription?.status === 'pending') {
        await updateSubscription(invoice.subscription_id, { status: 'incomplete' });
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
