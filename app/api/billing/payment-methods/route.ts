// app/api/billing/payment-methods/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { wompiConfig } from '@/lib/wompi/config';

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

    // Create payment source in Wompi
    console.log('Creating payment source in Wompi...');
    console.log('Request data:', { type, token, customer_email });
    
    const wompiResponse = await fetch(`${wompiConfig.baseUrl}/v1/payment_sources`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${wompiConfig.privateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        token,
        customer_email,
        acceptance_token,
        accept_personal_auth
      })
    });

    console.log('Wompi response status:', wompiResponse.status);
    
    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json();
      console.error('Wompi error:', errorData);
      throw new Error(errorData.error?.reason || 'Error creating payment source in Wompi');
    }

    const wompiData = await wompiResponse.json();
    const source = wompiData.data;

    // Save to database
    const { data: paymentSource, error: dbError } = await supabase
      .from('payment_sources')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
        workspace_id: workspace_id || null,
        wompi_id: source.id.toString(),
        type: source.type,
        status: source.status,
        brand: source.public_data?.card_brand || null,
        last_four: source.public_data?.last_four || null,
        holder_name: source.public_data?.card_holder || null,
        customer_email,
        is_default: true,
        raw_payload: wompiData
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Error saving payment source to database');
    }

    return NextResponse.json({ 
      payment_source: paymentSource,
      wompi_response: wompiData
    });

  } catch (error) {
    console.error('Error creating payment source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment source' },
      { status: 500 }
    );
  }
}