// app/api/billing/retry/[invoice_id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { 
  getInvoiceById, 
  updateInvoice,
  createTransaction 
} from '@/db/billing';
import { generateRetryReference } from '@/lib/wompi/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { invoice_id: string } }
) {
  try {
    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' }, 
        { status: 401 }
      );
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return NextResponse.json(
        { error: 'Invalid authorization format' }, 
        { status: 401 }
      );
    }

    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenParts[1]);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' }, 
        { status: 401 }
      );
    }

    // Get invoice and verify ownership
    const invoice = await getInvoiceById(params.invoice_id);
    
    // Verify workspace belongs to user
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', invoice.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!workspace) {
      return NextResponse.json(
        { error: 'Invoice not found' }, 
        { status: 404 }
      );
    }

    // Check if invoice is in failed status
    if (invoice.status !== 'failed') {
      return NextResponse.json(
        { error: 'Invoice is not in failed status' }, 
        { status: 400 }
      );
    }

    // Check if subscription has a valid payment source
    if (!invoice.subscriptions.payment_source_id) {
      return NextResponse.json(
        { error: 'No payment source available' }, 
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      transaction: wompiTransaction,
      invoice: {
        ...invoice,
        wompi_transaction_id: wompiTransaction.id,
        attempt_count: invoice.attempt_count + 1
      }
    });

  } catch (error) {
    console.error('Error retrying invoice:', error);
    return NextResponse.json(
      { error: 'Failed to retry invoice' }, 
      { status: 500 }
    );
  }
}


