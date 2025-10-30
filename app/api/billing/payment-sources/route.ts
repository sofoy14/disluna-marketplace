// app/api/billing/payment-sources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getPaymentSourcesByWorkspaceId, 
  createPaymentSource, 
  deletePaymentSource,
  setDefaultPaymentSource 
} from '@/db/payment-sources';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing workspace_id parameter' 
        },
        { status: 400 }
      );
    }

    const paymentSources = await getPaymentSourcesByWorkspaceId(workspaceId);
    
    return NextResponse.json({
      success: true,
      data: paymentSources
    });

  } catch (error) {
    console.error('Error fetching payment sources:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching payment sources',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspace_id, wompi_id, type, status, customer_email, last_four, expires_at } = await req.json();

    if (!workspace_id || !wompi_id || !type || !customer_email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: workspace_id, wompi_id, type, and customer_email' 
        },
        { status: 400 }
      );
    }

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('user_id')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Workspace not found' 
        },
        { status: 404 }
      );
    }

    // Create payment source
    const paymentSource = await createPaymentSource({
      workspace_id,
      user_id: workspace.user_id,
      wompi_id,
      type: type as 'CARD' | 'NEQUI' | 'PSE',
      status,
      customer_email,
      last_four,
      expires_at,
      is_default: false // Will be set to true by trigger if it's the first one
    });

    return NextResponse.json({
      success: true,
      data: paymentSource
    });

  } catch (error) {
    console.error('Error creating payment source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error creating payment source',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const paymentSourceId = url.searchParams.get('id');

    if (!paymentSourceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing payment source ID' 
        },
        { status: 400 }
      );
    }

    await deletePaymentSource(paymentSourceId);

    return NextResponse.json({
      success: true,
      message: 'Payment source deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error deleting payment source',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { payment_source_id, action } = await req.json();

    if (!payment_source_id || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: payment_source_id and action' 
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'set_default':
        result = await setDefaultPaymentSource(payment_source_id);
        break;
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Supported actions: set_default' 
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error updating payment source:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error updating payment source',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





