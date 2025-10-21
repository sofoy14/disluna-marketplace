// app/api/billing/payment-sources/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPaymentSourceById } from '@/db/billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get payment source
    const paymentSource = await getPaymentSourceById(params.id);

    // Verify user owns this payment source
    if (paymentSource.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Payment source not found' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ payment_source: paymentSource });

  } catch (error) {
    console.error('Error getting payment source:', error);
    return NextResponse.json(
      { error: 'Failed to get payment source' }, 
      { status: 500 }
    );
  }
}

