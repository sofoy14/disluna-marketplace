// app/api/billing/verify-transaction/route.ts
// Endpoint para verificar el estado de una transacción desde el cliente

import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { getInvoiceByReference } from '@/db/invoices';
import { getSubscriptionById } from '@/db/subscriptions';
import { formatCurrency } from '@/lib/wompi/utils';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get('transaction_id');
    const reference = url.searchParams.get('reference');

    if (!transactionId && !reference) {
      return NextResponse.json(
        { success: false, error: 'Missing transaction_id or reference' },
        { status: 400 }
      );
    }

    let transaction: any = null;
    let invoice: any = null;
    let subscription: any = null;

    // Si tenemos transaction_id, obtener de Wompi
    if (transactionId) {
      try {
        transaction = await wompiClient.getTransaction(transactionId);
      } catch (error) {
        console.error('Error fetching transaction from Wompi:', error);
      }
    }

    // Si tenemos reference, buscar en nuestra DB
    if (reference || transaction?.reference) {
      const ref = reference || transaction?.reference;
      invoice = await getInvoiceByReference(ref);
      
      if (invoice) {
        subscription = await getSubscriptionById(invoice.subscription_id);
      }
    }

    // Determinar estado final
    let status: 'success' | 'failed' | 'pending' | 'unknown' = 'unknown';
    let statusMessage = '';

    if (transaction) {
      switch (transaction.status) {
        case 'APPROVED':
          status = 'success';
          statusMessage = 'Tu pago ha sido procesado exitosamente';
          break;
        case 'DECLINED':
        case 'VOIDED':
        case 'ERROR':
          status = 'failed';
          statusMessage = transaction.status_message || 'El pago no pudo ser procesado';
          break;
        case 'PENDING':
          status = 'pending';
          statusMessage = 'El pago está siendo procesado';
          break;
        default:
          status = 'unknown';
          statusMessage = 'Estado de transacción desconocido';
      }
    } else if (invoice) {
      // Si no tenemos transacción de Wompi pero sí invoice
      switch (invoice.status) {
        case 'paid':
          status = 'success';
          statusMessage = 'Tu pago ha sido confirmado';
          break;
        case 'failed':
          status = 'failed';
          statusMessage = 'El pago no pudo ser procesado';
          break;
        case 'pending':
        case 'draft':
          status = 'pending';
          statusMessage = 'Esperando confirmación del pago';
          break;
        default:
          status = 'unknown';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        statusMessage,
        transaction: transaction ? {
          id: transaction.id,
          status: transaction.status,
          amount_in_cents: transaction.amount_in_cents,
          amount_formatted: formatCurrency(transaction.amount_in_cents),
          payment_method_type: transaction.payment_method_type,
          created_at: transaction.created_at,
          finalized_at: transaction.finalized_at,
          reference: transaction.reference
        } : null,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          plan_name: subscription.plans?.name,
          period_end: subscription.current_period_end
        } : null
      }
    });

  } catch (error) {
    console.error('Error verifying transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error verifying transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

