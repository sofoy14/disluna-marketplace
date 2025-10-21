// app/api/billing/reports/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency } from '@/lib/wompi/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // "2025-01"
    const workspaceId = searchParams.get('workspace_id');

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter required (YYYY-MM)' }, 
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        subscriptions(
          id,
          plans(name, amount_in_cents),
          payment_sources(type, brand, last_four)
        ),
        workspaces(name)
      `)
      .gte('period_start', `${month}-01`)
      .lt('period_start', `${month}-31`);

    // Filter by workspace if specified
    if (workspaceId) {
      // Verify workspace belongs to user
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('user_id', user.id)
        .single();
      
      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' }, 
          { status: 404 }
        );
      }
      
      query = query.eq('workspace_id', workspaceId);
    } else {
      // Filter by user's workspaces
      query = query.in('workspace_id', 
        supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
      );
    }

    const { data: invoices, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Generate CSV
    const csv = generateInvoiceCSV(invoices || []);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=invoices-${month}.csv`
      }
    });

  } catch (error) {
    console.error('Error generating invoice report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' }, 
      { status: 500 }
    );
  }
}

function generateInvoiceCSV(invoices: any[]): string {
  const headers = [
    'ID',
    'Workspace',
    'Plan',
    'Period Start',
    'Period End',
    'Amount',
    'Status',
    'Payment Method',
    'Transaction ID',
    'Created At',
    'Paid At'
  ];

  const rows = invoices.map(invoice => [
    invoice.id,
    invoice.workspaces?.name || 'N/A',
    invoice.subscriptions?.plans?.name || 'N/A',
    new Date(invoice.period_start).toLocaleDateString('es-CO'),
    new Date(invoice.period_end).toLocaleDateString('es-CO'),
    formatCurrency(invoice.amount_in_cents),
    invoice.status,
    invoice.subscriptions?.payment_sources ? 
      `${invoice.subscriptions.payment_sources.type} ${invoice.subscriptions.payment_sources.brand || ''} ${invoice.subscriptions.payment_sources.last_four || ''}`.trim() :
      'N/A',
    invoice.wompi_transaction_id || 'N/A',
    new Date(invoice.created_at).toLocaleDateString('es-CO'),
    invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('es-CO') : 'N/A'
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

