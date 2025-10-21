// app/api/billing/plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
  try {
    const { data: plans, error } = await supabaseServer
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("amount_in_cents", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    
    return NextResponse.json({ plans });

  } catch (error) {
    console.error('Error getting plans:', error);
    return NextResponse.json(
      { error: 'Failed to get plans' }, 
      { status: 500 }
    );
  }
}
