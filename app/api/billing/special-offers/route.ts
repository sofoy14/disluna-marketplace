// app/api/billing/special-offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
  try {
    const now = new Date().toISOString();
    
    const { data: offers, error } = await supabaseServer
      .from('special_offers')
      .select('*')
      .eq('is_active', true)
      .gte('valid_until', now)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ offers });

  } catch (error) {
    console.error('Error getting special offers:', error);
    return NextResponse.json(
      { error: 'Failed to get special offers' },
      { status: 500 }
    );
  }
}






