// app/api/billing/offers/route.ts
// Endpoint para obtener ofertas especiales activas

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const now = new Date().toISOString();
    
    // Get all active special offers
    const { data: offers, error } = await supabase
      .from('special_offers')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gt.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json(
        { success: false, error: 'Error fetching offers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offers || []
    });

  } catch (error) {
    console.error('Error in offers endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

