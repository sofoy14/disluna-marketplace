// app/api/billing/payment-methods/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';
import { createPaymentSource } from '@/db/billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    const { 
      token, 
      type, 
      customer_email, 
      acceptance_token, 
      accept_personal_auth,
      workspace_id 
    } = await req.json();

    // Validate required fields
    if (!token || !type || !customer_email || !acceptance_token || !accept_personal_auth) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
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

    // Create payment source in Wompi
    const wompiSource = await wompiClient.createPaymentSource({
      type: type as 'CARD' | 'NEQUI',
      token,
      customer_email,
      acceptance_token,
      accept_personal_auth
    });

    // Save payment source to database
    const paymentSource = await createPaymentSource({
      user_id: user.id,
      workspace_id: workspace_id || null,
      wompi_id: wompiSource.id,
      type: wompiSource.type,
      status: wompiSource.status,
      brand: wompiSource.public_data?.brand || null,
      last_four: wompiSource.public_data?.last_four || null,
      holder_name: wompiSource.public_data?.card_holder || null,
      customer_email,
      is_default: true, // First source becomes default
      expires_at: wompiSource.public_data?.exp_year && wompiSource.public_data?.exp_month 
        ? new Date(parseInt(wompiSource.public_data.exp_year), parseInt(wompiSource.public_data.exp_month) - 1)
        : null,
      raw_payload: wompiSource
    });

    return NextResponse.json({ 
      payment_source: paymentSource,
      wompi_source: wompiSource
    });

  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json(
      { error: 'Failed to create payment method' }, 
      { status: 500 }
    );
  }
}


